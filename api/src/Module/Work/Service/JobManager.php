<?php

declare(strict_types=1);

namespace App\Module\Work\Service;

use App\Module\Security\Contract\Service\ICurrentUserAccessor;
use App\Module\Work\Contract\Service\IGrossToNetEstimator;
use App\Module\Work\Domain\Entity\Job;
use App\Module\Work\Domain\Enum\ContractType;
use App\Module\Work\Domain\Enum\JobStatus;
use App\Module\Work\Domain\Enum\NetEstimateMode;
use App\Module\Work\Exception\InvalidWorkException;
use App\Module\Work\Exception\JobNotFoundException;
use App\Module\Work\Repository\JobRepository;
use Symfony\Component\Uid\Uuid;

final class JobManager
{
    public function __construct(
        private readonly JobRepository $jobs,
        private readonly WorkerManager $workers,
        private readonly IGrossToNetEstimator $netEstimator,
        private readonly WorkScheduleSupport $schedule,
        private readonly ICurrentUserAccessor $users,
    ) {
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function listForWorker(string $workerId): array
    {
        $worker = $this->workers->requireWorker($workerId);
        $result = [];
        foreach ($this->jobs->listForWorker($worker) as $job) {
            $result[] = $this->serializeJob($job);
        }

        return $result;
    }

    /**
     * @return array<string, mixed>
     */
    public function getJob(string $id): array
    {
        return $this->serializeJob($this->requireJob($id));
    }

    /**
     * @param array<string, mixed> $data
     *
     * @return array<string, mixed>
     */
    public function createJob(string $workerId, array $data): array
    {
        $worker = $this->workers->requireWorker($workerId);
        $startDate = $this->parseDate($data['startDate'] ?? null, 'startDate');
        $job = new Job(
            $worker,
            (string) $data['title'],
            (string) $data['companyName'],
            $startDate,
            (int) $data['grossHourlyRateCents'],
            $this->parseEnum(ContractType::class, $data['contractType'] ?? 'cdi', 'contractType'),
            $this->parseEnum(JobStatus::class, $data['status'] ?? 'non_cadre', 'status'),
            isset($data['contractWeeklyMinutes']) ? (int) $data['contractWeeklyMinutes'] : Job::DEFAULT_WEEKLY_MINUTES,
            isset($data['position']) ? (int) $data['position'] : 0,
        );
        $this->applyOptional($job, $data);
        $this->jobs->save($job);

        return $this->serializeJob($job);
    }

    /**
     * @param array<string, mixed> $data
     *
     * @return array<string, mixed>
     */
    public function updateJob(string $id, array $data): array
    {
        $job = $this->requireJob($id);
        if (isset($data['title'])) {
            $job->setTitle((string) $data['title']);
        }
        if (isset($data['companyName'])) {
            $job->setCompanyName((string) $data['companyName']);
        }
        if (isset($data['startDate'])) {
            $job->setStartDate($this->parseDate($data['startDate'], 'startDate'));
        }
        if (isset($data['grossHourlyRateCents'])) {
            $job->setGrossHourlyRateCents((int) $data['grossHourlyRateCents']);
        }
        if (isset($data['contractType'])) {
            $job->setContractType($this->parseEnum(ContractType::class, $data['contractType'], 'contractType'));
        }
        if (isset($data['status'])) {
            $job->setStatus($this->parseEnum(JobStatus::class, $data['status'], 'status'));
        }
        if (isset($data['contractWeeklyMinutes'])) {
            $job->setContractWeeklyMinutes((int) $data['contractWeeklyMinutes']);
        }
        if (isset($data['position'])) {
            $job->setPosition((int) $data['position']);
        }
        $this->applyOptional($job, $data);
        $this->jobs->save($job);

        return $this->serializeJob($job);
    }

    /**
     * @return array<string, mixed>
     */
    public function archiveJob(string $id): array
    {
        $job = $this->requireJob($id);
        $job->archive();
        $this->jobs->save($job);

        return $this->serializeJob($job);
    }

    /**
     * @return array<string, mixed>
     */
    public function suggestContributionRate(string $id): array
    {
        $job = $this->requireJob($id);

        return $this->netEstimator->suggestContributionRate($job);
    }

    public function requireJob(string $id): Job
    {
        try {
            $uuid = Uuid::fromString($id);
        } catch (\InvalidArgumentException) {
            throw new JobNotFoundException();
        }

        $job = $this->jobs->findOwned($uuid, $this->users->requireUser());
        if (null === $job) {
            throw new JobNotFoundException();
        }

        return $job;
    }

    /**
     * @return array<string, mixed>
     */
    public function serializeJob(Job $job): array
    {
        $worker = $job->getWorker();

        return [
            'id'                             => (string) $job->getId(),
            'workerId'                       => (string) $worker->getId(),
            'workerDisplayName'              => $worker->getDisplayName(),
            'title'                          => $job->getTitle(),
            'companyName'                    => $job->getCompanyName(),
            'companySiret'                   => $job->getCompanySiret(),
            'contractType'                   => $job->getContractType()->value,
            'status'                         => $job->getStatus()->value,
            'startDate'                      => $job->getStartDate()->format('Y-m-d'),
            'endDate'                        => $job->getEndDate()?->format('Y-m-d'),
            'notes'                          => $job->getNotes(),
            'color'                          => $job->getColor(),
            'icon'                           => $job->getIcon(),
            'position'                       => $job->getPosition(),
            'contractWeeklyMinutes'          => $job->getContractWeeklyMinutes(),
            'timeTrackingEnabled'            => $job->isTimeTrackingEnabled(),
            'weekStartsOn'                   => $job->getWeekStartsOn(),
            'workDaysMask'                   => $job->getWorkDaysMask(),
            'weekTemplate'                   => $job->getWeekTemplate(),
            'grossHourlyRateCents'           => $job->getGrossHourlyRateCents(),
            'overtimeRateBps'                => $job->getOvertimeRateBps(),
            'overtimeRate2Bps'               => $job->getOvertimeRate2Bps(),
            'overtimeThresholdWeeklyMinutes' => $job->getOvertimeThresholdWeeklyMinutes(),
            'employeeContributionRateBps'    => $job->getEmployeeContributionRateBps(),
            'pasRateBps'                     => $job->getPasRateBps(),
            'netEstimateMode'                => $job->getNetEstimateMode()->value,
            'archivedAt'                     => $job->getArchivedAt()?->format(\DateTimeInterface::ATOM),
            'createdAt'                      => $job->getCreatedAt()->format(\DateTimeInterface::ATOM),
        ];
    }

    /**
     * @param array<string, mixed> $data
     */
    private function applyOptional(Job $job, array $data): void
    {
        if (\array_key_exists('companySiret', $data)) {
            $job->setCompanySiret(null === $data['companySiret'] ? null : (string) $data['companySiret']);
        }
        if (\array_key_exists('endDate', $data)) {
            $job->setEndDate(null === $data['endDate'] || '' === $data['endDate']
                ? null
                : $this->parseDate($data['endDate'], 'endDate'));
        }
        if (\array_key_exists('notes', $data)) {
            $job->setNotes(null === $data['notes'] ? null : (string) $data['notes']);
        }
        if (\array_key_exists('color', $data)) {
            $job->setColor(null === $data['color'] ? null : (string) $data['color']);
        }
        if (\array_key_exists('icon', $data)) {
            $job->setIcon(null === $data['icon'] ? null : (string) $data['icon']);
        }
        if (isset($data['timeTrackingEnabled'])) {
            $job->setTimeTrackingEnabled((bool) $data['timeTrackingEnabled']);
        }
        if (isset($data['weekStartsOn'])) {
            $weekStartsOn = (int) $data['weekStartsOn'];
            if ($weekStartsOn < 0 || $weekStartsOn > 6) {
                throw new InvalidWorkException('weekStartsOn doit être entre 0 (dimanche) et 6 (samedi).');
            }
            $job->setWeekStartsOn($weekStartsOn);
        }
        if (isset($data['workDaysMask'])) {
            $mask = (int) $data['workDaysMask'];
            if ($mask < 0 || $mask > 127) {
                throw new InvalidWorkException('workDaysMask invalide.');
            }
            $job->setWorkDaysMask($mask);
        }
        if (\array_key_exists('weekTemplate', $data)) {
            if (null === $data['weekTemplate']) {
                $job->setWeekTemplate(null);
            } else {
                $template = $this->schedule->normalizeWeekTemplate($data['weekTemplate']);
                $job->setWeekTemplate($template);
                $job->setWorkDaysMask($this->schedule->maskFromWeekTemplate($template));
            }
        }
        if (isset($data['overtimeRateBps'])) {
            $job->setOvertimeRateBps((int) $data['overtimeRateBps']);
        }
        if (\array_key_exists('overtimeRate2Bps', $data)) {
            $job->setOvertimeRate2Bps(null === $data['overtimeRate2Bps'] ? null : (int) $data['overtimeRate2Bps']);
        }
        if (\array_key_exists('overtimeThresholdWeeklyMinutes', $data)) {
            $job->setOvertimeThresholdWeeklyMinutes(
                null === $data['overtimeThresholdWeeklyMinutes'] ? null : (int) $data['overtimeThresholdWeeklyMinutes'],
            );
        }
        if (isset($data['employeeContributionRateBps'])) {
            $bps = (int) $data['employeeContributionRateBps'];
            if ($bps < 0 || $bps > 10000) {
                throw new InvalidWorkException('employeeContributionRateBps doit être entre 0 et 10000.');
            }
            $job->setEmployeeContributionRateBps($bps);
        }
        if (isset($data['pasRateBps'])) {
            $bps = (int) $data['pasRateBps'];
            if ($bps < 0 || $bps > 10000) {
                throw new InvalidWorkException('pasRateBps doit être entre 0 et 10000.');
            }
            $job->setPasRateBps($bps);
        }
        if (isset($data['netEstimateMode'])) {
            $job->setNetEstimateMode($this->parseEnum(NetEstimateMode::class, $data['netEstimateMode'], 'netEstimateMode'));
        }
    }

    private function parseDate(mixed $value, string $field): \DateTimeImmutable
    {
        if (!\is_string($value) || '' === trim($value)) {
            throw new InvalidWorkException(\sprintf('Le champ "%s" est requis (YYYY-MM-DD).', $field));
        }
        $date = \DateTimeImmutable::createFromFormat('Y-m-d', trim($value));
        if (false === $date) {
            throw new InvalidWorkException(\sprintf('Le champ "%s" doit être une date YYYY-MM-DD.', $field));
        }

        return $date->setTime(0, 0);
    }

    /**
     * @template T of \BackedEnum
     *
     * @param class-string<T> $enumClass
     *
     * @return T
     */
    private function parseEnum(string $enumClass, mixed $value, string $field): \BackedEnum
    {
        if (!\is_string($value)) {
            throw new InvalidWorkException(\sprintf('Le champ "%s" est invalide.', $field));
        }
        $case = $enumClass::tryFrom($value);
        if (null === $case) {
            throw new InvalidWorkException(\sprintf('Valeur invalide pour "%s".', $field));
        }

        return $case;
    }
}
