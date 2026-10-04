<?php

declare(strict_types=1);

namespace App\Module\Work\Service;

use App\Module\Security\Contract\Service\ICurrentUserAccessor;
use App\Module\Work\Domain\Entity\WorkPlanEntry;
use App\Module\Work\Domain\Entity\WorkPlanSegment;
use App\Module\Work\Exception\InvalidWorkException;
use App\Module\Work\Exception\WorkPlanEntryNotFoundException;
use App\Module\Work\Repository\TimeShortcutRepository;
use App\Module\Work\Repository\WorkPlanEntryRepository;
use Symfony\Component\Uid\Uuid;

final class WorkPlanManager
{
    public function __construct(
        private readonly WorkPlanEntryRepository $plans,
        private readonly TimeShortcutRepository $shortcuts,
        private readonly JobManager $jobs,
        private readonly WorkTimeCalculator $calculator,
        private readonly WorkScheduleSupport $schedule,
        private readonly ICurrentUserAccessor $users,
    ) {
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function listEntries(string $jobId, string $from, string $to): array
    {
        $job = $this->jobs->requireJob($jobId);
        $fromDate = $this->schedule->parseDate($from, 'from');
        $toDate = $this->schedule->parseDate($to, 'to');
        if ($fromDate > $toDate) {
            throw new InvalidWorkException('"from" doit être antérieur ou égal à "to".');
        }

        $result = [];
        foreach ($this->plans->listForJobBetween($job, $fromDate, $toDate) as $entry) {
            $result[] = $this->serialize($entry);
        }

        return $result;
    }

    /**
     * @param array{
     *   workDate: string,
     *   segments: list<array{start: string, end: string}>,
     *   pauseMinutes?: int,
     *   notes?: ?string
     * } $data
     *
     * @return array<string, mixed>
     */
    public function upsertEntry(string $jobId, array $data): array
    {
        $job = $this->jobs->requireJob($jobId);
        $workDate = $this->schedule->parseDate($data['workDate'], 'workDate');
        $entry = $this->plans->findForJobAndDate($job, $workDate) ?? new WorkPlanEntry($job, $workDate);
        $entry->setPauseMinutes(isset($data['pauseMinutes']) ? (int) $data['pauseMinutes'] : 0);
        if (\array_key_exists('notes', $data)) {
            $entry->setNotes(null === $data['notes'] ? null : (string) $data['notes']);
        }
        $this->replaceSegments($entry, $data['segments']);
        $this->plans->save($entry);

        return $this->serialize($entry);
    }

    /**
     * @param array<string, mixed> $data
     *
     * @return array<string, mixed>
     */
    public function updateEntry(string $id, array $data): array
    {
        $entry = $this->requireOwned($id);
        if (isset($data['workDate'])) {
            $newDate = $this->schedule->parseDate($data['workDate'], 'workDate');
            $existing = $this->plans->findForJobAndDate($entry->getJob(), $newDate);
            if (null !== $existing && !$existing->getId()->equals($entry->getId())) {
                throw new InvalidWorkException('Un planning existe déjà pour cette date.');
            }
            $entry->setWorkDate($newDate);
        }
        if (isset($data['pauseMinutes'])) {
            $entry->setPauseMinutes((int) $data['pauseMinutes']);
        }
        if (\array_key_exists('notes', $data)) {
            $entry->setNotes(null === $data['notes'] ? null : (string) $data['notes']);
        }
        if (isset($data['segments']) && \is_array($data['segments'])) {
            /** @var list<mixed> $raw */
            $raw = array_values($data['segments']);
            $this->replaceSegments($entry, $this->schedule->normalizeSegments($raw));
        }
        $this->plans->save($entry);

        return $this->serialize($entry);
    }

    public function deleteEntry(string $id): void
    {
        $this->plans->remove($this->requireOwned($id));
    }

    /**
     * @param array{
     *   yearMonth: string,
     *   shortcutId?: ?string,
     *   segments?: mixed,
     *   pauseMinutes?: int|null,
     *   overwrite?: bool
     * } $data
     *
     * @return array{created: int, updated: int, skipped: int}
     */
    public function fillMonth(string $jobId, array $data): array
    {
        $job = $this->jobs->requireJob($jobId);
        [$from, $to] = $this->calculator->monthBounds($data['yearMonth']);
        $overwrite = (bool) ($data['overwrite'] ?? false);
        $weekTemplate = $job->getWeekTemplate();

        $fallbackSegments = null;
        $fallbackPause = \is_int($data['pauseMinutes'] ?? null) ? (int) $data['pauseMinutes'] : 30;
        $shortcutId = $data['shortcutId'] ?? null;
        if (null === $weekTemplate) {
            if (null !== $shortcutId && '' !== $shortcutId) {
                try {
                    $uuid = Uuid::fromString($shortcutId);
                } catch (\InvalidArgumentException) {
                    throw new InvalidWorkException('Raccourci invalide.');
                }
                $shortcut = $this->shortcuts->findOwned($uuid, $this->users->requireUser());
                if (null === $shortcut || !$shortcut->getJob()->getId()->equals($job->getId())) {
                    throw new InvalidWorkException('Raccourci introuvable pour cet emploi.');
                }
                $fallbackSegments = $shortcut->getSegments();
                $fallbackPause = $shortcut->getPauseMinutes();
            } elseif (isset($data['segments']) && \is_array($data['segments'])) {
                /** @var list<mixed> $raw */
                $raw = array_values($data['segments']);
                $fallbackSegments = $this->schedule->normalizeSegments($raw);
            } else {
                $list = $this->shortcuts->listForJob($job);
                if ([] !== $list) {
                    $fallbackSegments = $list[0]->getSegments();
                    $fallbackPause = $list[0]->getPauseMinutes();
                } else {
                    $fallbackSegments = [
                        ['start' => '08:00', 'end' => '12:00'],
                        ['start' => '13:30', 'end' => '18:00'],
                    ];
                    $fallbackPause = 30;
                }
            }
        }

        $created = 0;
        $updated = 0;
        $skipped = 0;
        for ($day = $from; $day <= $to; $day = $day->modify('+1 day')) {
            $bit = $this->calculator->mondayBasedBit($day);
            $segments = null;
            $pause = $fallbackPause;

            if (null !== $weekTemplate) {
                $dayTemplate = $weekTemplate[$bit] ?? null;
                if (null === $dayTemplate || !($dayTemplate['enabled'] ?? false)) {
                    continue;
                }
                $segments = $dayTemplate['segments'];
                $pause = (int) ($dayTemplate['pauseMinutes'] ?? 0);
            } else {
                if (!$this->calculator->isWorkDay($job, $day)) {
                    continue;
                }
                $segments = $fallbackSegments;
            }

            if (null === $segments) {
                continue;
            }

            $existing = $this->plans->findForJobAndDate($job, $day);
            if (null !== $existing && !$overwrite) {
                ++$skipped;
                continue;
            }
            $entry = $existing ?? new WorkPlanEntry($job, $day);
            $entry->setPauseMinutes($pause);
            $this->replaceSegments($entry, $segments);
            $this->plans->save($entry);
            if (null === $existing) {
                ++$created;
            } else {
                ++$updated;
            }
        }

        return ['created' => $created, 'updated' => $updated, 'skipped' => $skipped];
    }

    /**
     * @param list<array{start: string, end: string}> $segments
     */
    private function replaceSegments(WorkPlanEntry $entry, array $segments): void
    {
        $normalized = $this->schedule->normalizeSegments($segments);
        $entry->clearSegments();
        foreach ($normalized as $i => $seg) {
            $entry->addSegment(new WorkPlanSegment(
                $entry,
                $this->schedule->parseTime($seg['start'], 'start'),
                $this->schedule->parseTime($seg['end'], 'end'),
                $i,
            ));
        }
    }

    private function requireOwned(string $id): WorkPlanEntry
    {
        try {
            $uuid = Uuid::fromString($id);
        } catch (\InvalidArgumentException) {
            throw new WorkPlanEntryNotFoundException();
        }
        $entry = $this->plans->findOwned($uuid, $this->users->requireUser());
        if (null === $entry) {
            throw new WorkPlanEntryNotFoundException();
        }

        return $entry;
    }

    /**
     * @return array<string, mixed>
     */
    private function serialize(WorkPlanEntry $entry): array
    {
        $segments = [];
        foreach ($entry->getSegments() as $segment) {
            $segments[] = [
                'id'       => (string) $segment->getId(),
                'start'    => $segment->getStartTime()->format('H:i'),
                'end'      => $segment->getEndTime()->format('H:i'),
                'position' => $segment->getPosition(),
            ];
        }

        return [
            'id'             => (string) $entry->getId(),
            'jobId'          => (string) $entry->getJob()->getId(),
            'workDate'       => $entry->getWorkDate()->format('Y-m-d'),
            'pauseMinutes'   => $entry->getPauseMinutes(),
            'plannedMinutes' => $this->calculator->plannedMinutes($entry),
            'notes'          => $entry->getNotes(),
            'segments'       => $segments,
            'createdAt'      => $entry->getCreatedAt()->format(\DateTimeInterface::ATOM),
            'updatedAt'      => $entry->getUpdatedAt()->format(\DateTimeInterface::ATOM),
        ];
    }
}
