<?php

declare(strict_types=1);

namespace App\Tests\Unit\Module\Work\Service;

use App\Module\Security\Domain\Entity\User;
use App\Module\Security\Domain\Enum\UserRole;
use App\Module\Work\Domain\Entity\Job;
use App\Module\Work\Domain\Entity\Worker;
use App\Module\Work\Service\LocalGrossToNetEstimator;
use PHPUnit\Framework\TestCase;

final class LocalGrossToNetEstimatorTest extends TestCase
{
    public function testEstimateAppliesContributionsPasAndFixedDeductions(): void
    {
        $job = $this->job();
        $job->setEmployeeContributionRateBps(2200);
        $job->setPasRateBps(0);

        $estimator = new LocalGrossToNetEstimator();
        $result = $estimator->estimateFromGross($job, 227330, 9755);

        self::assertSame(227330, $result['estimatedGrossCents']);
        self::assertSame(177317, $result['estimatedNetBeforeTaxCents']); // 227330 * 0.78
        self::assertSame(0, $result['estimatedPasCents']);
        self::assertSame(9755, $result['estimatedFixedDeductionsCents']);
        self::assertSame(167562, $result['estimatedNetPayableCents']); // 177317 - 9755
    }

    public function testFixedDeductionsCannotPushNetBelowZero(): void
    {
        $job = $this->job();
        $job->setEmployeeContributionRateBps(0);
        $estimator = new LocalGrossToNetEstimator();
        $result = $estimator->estimateFromGross($job, 1000, 5000);

        self::assertSame(0, $result['estimatedNetPayableCents']);
    }

    private function job(): Job
    {
        $user = new User('worker@example.test', 'hash', 'Jean', 'Dupont', [UserRole::User]);
        $worker = new Worker($user, 'Jean', 'Dupont');

        return new Job(
            $worker,
            'Maraicher',
            'Les jardins',
            new \DateTimeImmutable('2026-04-16'),
            1231,
        );
    }
}
