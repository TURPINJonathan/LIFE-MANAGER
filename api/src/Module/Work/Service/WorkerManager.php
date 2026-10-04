<?php

declare(strict_types=1);

namespace App\Module\Work\Service;

use App\Module\Security\Contract\Service\ICurrentUserAccessor;
use App\Module\Work\Domain\Entity\Job;
use App\Module\Work\Domain\Entity\Worker;
use App\Module\Work\Exception\WorkerNotFoundException;
use App\Module\Work\Repository\JobRepository;
use App\Module\Work\Repository\WorkerRepository;
use Symfony\Component\Uid\Uuid;

final class WorkerManager
{
    public function __construct(
        private readonly WorkerRepository $workers,
        private readonly JobRepository $jobs,
        private readonly ICurrentUserAccessor $users,
    ) {
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function listWorkers(bool $includeArchived = false): array
    {
        $owner = $this->users->requireUser();
        $result = [];
        foreach ($this->workers->listForOwner($owner, $includeArchived) as $worker) {
            $result[] = $this->serializeWorker($worker, !$includeArchived);
        }

        return $result;
    }

    /**
     * @return array<string, mixed>
     */
    public function getWorker(string $id): array
    {
        return $this->serializeWorker($this->requireWorker($id), true);
    }

    /**
     * @param array{displayName: string, notes?: ?string, position?: int} $data
     *
     * @return array<string, mixed>
     */
    public function createWorker(array $data): array
    {
        $worker = new Worker(
            $this->users->requireUser(),
            $data['displayName'],
            $data['notes'] ?? null,
            $data['position'] ?? 0,
        );
        $this->workers->save($worker);

        return $this->serializeWorker($worker, true);
    }

    /**
     * @param array{displayName?: string, notes?: ?string, position?: int} $data
     *
     * @return array<string, mixed>
     */
    public function updateWorker(string $id, array $data): array
    {
        $worker = $this->requireWorker($id);
        if (isset($data['displayName'])) {
            $worker->setDisplayName($data['displayName']);
        }
        if (\array_key_exists('notes', $data)) {
            $worker->setNotes($data['notes']);
        }
        if (isset($data['position'])) {
            $worker->setPosition($data['position']);
        }
        $this->workers->save($worker);

        return $this->serializeWorker($worker, true);
    }

    /**
     * @return array<string, mixed>
     */
    public function archiveWorker(string $id): array
    {
        $worker = $this->requireWorker($id);
        $worker->archive();
        foreach ($this->jobs->listForWorker($worker) as $job) {
            if (!$job->isArchived()) {
                $job->archive();
                $this->jobs->save($job);
            }
        }
        $this->workers->save($worker);

        return $this->serializeWorker($worker, false);
    }

    public function requireWorker(string $id): Worker
    {
        try {
            $uuid = Uuid::fromString($id);
        } catch (\InvalidArgumentException) {
            throw new WorkerNotFoundException();
        }

        $worker = $this->workers->findOwned($uuid, $this->users->requireUser());
        if (null === $worker) {
            throw new WorkerNotFoundException();
        }

        return $worker;
    }

    /**
     * @return array<string, mixed>
     */
    public function serializeWorker(Worker $worker, bool $activeJobsOnly = true): array
    {
        $jobs = [];
        foreach ($this->jobs->listForWorker($worker, !$activeJobsOnly) as $job) {
            $jobs[] = $this->serializeJobSummary($job);
        }

        return [
            'id'          => (string) $worker->getId(),
            'displayName' => $worker->getDisplayName(),
            'notes'       => $worker->getNotes(),
            'position'    => $worker->getPosition(),
            'archivedAt'  => $worker->getArchivedAt()?->format(\DateTimeInterface::ATOM),
            'createdAt'   => $worker->getCreatedAt()->format(\DateTimeInterface::ATOM),
            'jobs'        => $jobs,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function serializeJobSummary(Job $job): array
    {
        return [
            'id'                    => (string) $job->getId(),
            'workerId'              => (string) $job->getWorker()->getId(),
            'title'                 => $job->getTitle(),
            'companyName'           => $job->getCompanyName(),
            'contractType'          => $job->getContractType()->value,
            'status'                => $job->getStatus()->value,
            'startDate'             => $job->getStartDate()->format('Y-m-d'),
            'endDate'               => $job->getEndDate()?->format('Y-m-d'),
            'color'                 => $job->getColor(),
            'icon'                  => $job->getIcon(),
            'position'              => $job->getPosition(),
            'contractWeeklyMinutes' => $job->getContractWeeklyMinutes(),
            'timeTrackingEnabled'   => $job->isTimeTrackingEnabled(),
            'grossHourlyRateCents'  => $job->getGrossHourlyRateCents(),
            'archivedAt'            => $job->getArchivedAt()?->format(\DateTimeInterface::ATOM),
        ];
    }
}
