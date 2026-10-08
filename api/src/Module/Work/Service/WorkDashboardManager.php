<?php

declare(strict_types=1);

namespace App\Module\Work\Service;

use App\Module\Security\Contract\Service\ICurrentUserAccessor;
use App\Module\Work\Repository\JobRepository;
use App\Module\Work\Repository\TimeEntryRepository;
use App\Module\Work\Repository\WorkerRepository;
use App\Module\Work\Repository\WorkPlanEntryRepository;

final class WorkDashboardManager
{
    public function __construct(
        private readonly WorkerRepository $workers,
        private readonly JobRepository $jobs,
        private readonly TimeEntryRepository $entries,
        private readonly WorkPlanEntryRepository $plans,
        private readonly WorkTimeCalculator $calculator,
        private readonly JobManager $jobManager,
        private readonly ICurrentUserAccessor $users,
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function dashboard(string $yearMonth): array
    {
        [$from, $to] = $this->calculator->monthBounds($yearMonth);
        $daysInMonth = (int) $to->format('j');
        $owner = $this->users->requireUser();
        $workers = $this->workers->listForOwner($owner);

        $timeline = [];
        for ($d = $from; $d <= $to; $d = $d->modify('+1 day')) {
            $key = $d->format('Y-m-d');
            $timeline[$key] = [
                'date'              => $key,
                'plannedMinutes'    => 0,
                'actualMinutes'     => 0,
                'plannedCumulative' => 0,
                'actualCumulative'  => 0,
            ];
        }

        $workerPayloads = [];
        $totalsPlanned = 0;
        $totalsActual = 0;
        $totalsPlannedGross = 0;
        $totalsActualGross = 0;
        $totalsPlannedNet = 0;
        $totalsActualNet = 0;
        $alerts = [];

        foreach ($workers as $worker) {
            $jobs = $this->jobs->listForWorker($worker);
            $jobRows = [];
            $workerPlanned = 0;
            $workerActual = 0;
            $workerPlannedGross = 0;
            $workerActualGross = 0;
            $workerPlannedNet = 0;
            $workerActualNet = 0;

            foreach ($jobs as $job) {
                $planEntries = $this->plans->listForJobBetween($job, $from, $to);
                $actualEntries = $this->entries->listForJobBetween($job, $from, $to);
                $workDays = 0;
                for ($d = $from; $d <= $to; $d = $d->modify('+1 day')) {
                    if ($this->calculator->isWorkDay($job, $d)) {
                        ++$workDays;
                    }
                }
                $weeksApprox = max(1, $daysInMonth / 7);
                $contractBudget = (int) round($job->getContractWeeklyMinutes() * $weeksApprox);

                $plannedSummary = $this->calculator->summarizePlanWithContractBudget(
                    $job,
                    $planEntries,
                    $contractBudget,
                    $daysInMonth,
                );
                $actualSummary = $this->calculator->summarizeWithContractBudget(
                    $job,
                    $actualEntries,
                    $contractBudget,
                    $daysInMonth,
                );

                foreach ($planEntries as $entry) {
                    $key = $entry->getWorkDate()->format('Y-m-d');
                    if (isset($timeline[$key])) {
                        $timeline[$key]['plannedMinutes'] += $this->calculator->plannedMinutes($entry);
                    }
                }
                foreach ($actualEntries as $entry) {
                    $key = $entry->getWorkDate()->format('Y-m-d');
                    if (isset($timeline[$key])) {
                        $timeline[$key]['actualMinutes'] += $this->calculator->workedMinutes($entry);
                    }
                }

                $workerPlanned += $plannedSummary['workedMinutes'];
                $workerActual += $actualSummary['workedMinutes'];
                $workerPlannedGross += $plannedSummary['estimatedGrossCents'];
                $workerActualGross += $actualSummary['estimatedGrossCents'];
                $workerPlannedNet += $plannedSummary['estimatedNetPayableCents'];
                $workerActualNet += $actualSummary['estimatedNetPayableCents'];

                if ($actualSummary['overtimeMinutes'] > 0) {
                    $alerts[] = [
                        'kind'     => 'overtime',
                        'workerId' => (string) $worker->getId(),
                        'jobId'    => (string) $job->getId(),
                        'label'    => $job->getTitle(),
                        'detail'   => 'Heures supplémentaires ce mois',
                        'value'    => $actualSummary['overtimeMinutes'],
                    ];
                }
                if ($plannedSummary['workedMinutes'] > 0
                    && $actualSummary['workedMinutes'] < (int) round($plannedSummary['workedMinutes'] * 0.9)
                    && (new \DateTimeImmutable()) > $from
                ) {
                    $alerts[] = [
                        'kind'     => 'under',
                        'workerId' => (string) $worker->getId(),
                        'jobId'    => (string) $job->getId(),
                        'label'    => $job->getTitle(),
                        'detail'   => 'Réel nettement sous le prévu',
                        'value'    => $plannedSummary['workedMinutes'] - $actualSummary['workedMinutes'],
                    ];
                }

                $jobRows[] = [
                    'job'      => $this->jobManager->serializeJob($job),
                    'planned'  => $plannedSummary,
                    'actual'   => $actualSummary,
                    'workDays' => $workDays,
                ];
            }

            $totalsPlanned += $workerPlanned;
            $totalsActual += $workerActual;
            $totalsPlannedGross += $workerPlannedGross;
            $totalsActualGross += $workerActualGross;
            $totalsPlannedNet += $workerPlannedNet;
            $totalsActualNet += $workerActualNet;

            $workerPayloads[] = [
                'id'                     => (string) $worker->getId(),
                'firstName'              => $worker->getFirstName(),
                'lastName'               => $worker->getLastName(),
                'fullName'               => $worker->getFullName(),
                'notes'                  => $worker->getNotes(),
                'plannedMinutes'         => $workerPlanned,
                'actualMinutes'          => $workerActual,
                'plannedGrossCents'      => $workerPlannedGross,
                'actualGrossCents'       => $workerActualGross,
                'plannedNetPayableCents' => $workerPlannedNet,
                'actualNetPayableCents'  => $workerActualNet,
                'jobs'                   => $jobRows,
            ];
        }

        $cumP = 0;
        $cumA = 0;
        $timelineOut = [];
        foreach ($timeline as $row) {
            $cumP += $row['plannedMinutes'];
            $cumA += $row['actualMinutes'];
            $row['plannedCumulative'] = $cumP;
            $row['actualCumulative'] = $cumA;
            $timelineOut[] = $row;
        }

        return [
            'yearMonth'   => $yearMonth,
            'from'        => $from->format('Y-m-d'),
            'to'          => $to->format('Y-m-d'),
            'daysInMonth' => $daysInMonth,
            'totals'      => [
                'plannedMinutes'         => $totalsPlanned,
                'actualMinutes'          => $totalsActual,
                'deltaMinutes'           => $totalsActual - $totalsPlanned,
                'plannedGrossCents'      => $totalsPlannedGross,
                'actualGrossCents'       => $totalsActualGross,
                'plannedNetPayableCents' => $totalsPlannedNet,
                'actualNetPayableCents'  => $totalsActualNet,
            ],
            'workers'  => $workerPayloads,
            'timeline' => $timelineOut,
            'alerts'   => \array_slice($alerts, 0, 8),
        ];
    }
}
