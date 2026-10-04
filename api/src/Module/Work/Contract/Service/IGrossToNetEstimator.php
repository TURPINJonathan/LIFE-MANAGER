<?php

declare(strict_types=1);

namespace App\Module\Work\Contract\Service;

use App\Module\Work\Domain\Entity\Job;

interface IGrossToNetEstimator
{
    /**
     * @return array{
     *   estimatedGrossCents: int,
     *   estimatedNetBeforeTaxCents: int,
     *   estimatedPasCents: int,
     *   estimatedNetPayableCents: int,
     *   employeeContributionRateBps: int,
     *   pasRateBps: int
     * }
     */
    public function estimateFromGross(Job $job, int $grossCents): array;

    /**
     * Suggest an employee contribution rate (bps) for the job without persisting it.
     *
     * @return array{employeeContributionRateBps: int, source: string, note?: string}
     */
    public function suggestContributionRate(Job $job, int $sampleGrossCents = 300000): array;
}
