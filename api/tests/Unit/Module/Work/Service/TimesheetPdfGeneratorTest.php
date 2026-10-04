<?php

declare(strict_types=1);

namespace App\Tests\Unit\Module\Work\Service;

use App\Module\Security\Domain\Entity\User;
use App\Module\Security\Domain\Enum\UserRole;
use App\Module\Work\Contract\Service\IGrossToNetEstimator;
use App\Module\Work\Domain\Entity\Job;
use App\Module\Work\Domain\Entity\TimeEntry;
use App\Module\Work\Domain\Entity\TimeSegment;
use App\Module\Work\Domain\Entity\Worker;
use App\Module\Work\Service\FrenchPublicHolidays;
use App\Module\Work\Service\TimesheetPdfGenerator;
use App\Module\Work\Service\WorkTimeCalculator;
use PHPUnit\Framework\TestCase;

final class TimesheetPdfGeneratorTest extends TestCase
{
    private TimesheetPdfGenerator $generator;

    protected function setUp(): void
    {
        $net = $this->createMock(IGrossToNetEstimator::class);
        $this->generator = new TimesheetPdfGenerator(
            new WorkTimeCalculator($net),
            new FrenchPublicHolidays(),
        );
    }

    public function testFormatMinutes(): void
    {
        self::assertSame('0:00', $this->generator->formatMinutes(0));
        self::assertSame('0:30', $this->generator->formatMinutes(30));
        self::assertSame('8:00', $this->generator->formatMinutes(480));
        self::assertSame('8:15', $this->generator->formatMinutes(495));
    }

    public function testFormatDateLabelIsFrench(): void
    {
        $label = $this->generator->formatDateLabel(new \DateTimeImmutable('2026-09-01'));
        self::assertSame('mardi 1 septembre 2026', $label);
    }

    public function testFormatBlankDayLabel(): void
    {
        self::assertSame('Mardi 1er', $this->generator->formatBlankDayLabel(new \DateTimeImmutable('2026-09-01')));
        self::assertSame('Mercredi 2', $this->generator->formatBlankDayLabel(new \DateTimeImmutable('2026-09-02')));
        self::assertSame('Dimanche 6', $this->generator->formatBlankDayLabel(new \DateTimeImmutable('2026-09-06')));
    }

    public function testGenerateBlankProducesPdf(): void
    {
        $result = $this->generator->generateBlank('2026-09');
        self::assertStringStartsWith('%PDF', $result['binary']);
        self::assertSame('pointage-vierge-2026-09.pdf', $result['filename']);
    }

    public function testGenerateProducesPdfWithFilledDay(): void
    {
        $user = new User('worker@example.test', 'hash', 'Jean', 'Dupont', [UserRole::User]);
        $worker = new Worker($user, 'Jean', 'Dupont');
        $job = new Job(
            $worker,
            'Vendeur',
            'Boutique',
            new \DateTimeImmutable('2026-01-01'),
            1200,
        );

        $entry = new TimeEntry($job, new \DateTimeImmutable('2026-09-01'));
        $entry->setPauseMinutes(30);
        $entry->addSegment(new TimeSegment(
            $entry,
            new \DateTimeImmutable('1970-01-01 08:00:00'),
            new \DateTimeImmutable('1970-01-01 12:00:00'),
            0,
        ));
        $entry->addSegment(new TimeSegment(
            $entry,
            new \DateTimeImmutable('1970-01-01 13:30:00'),
            new \DateTimeImmutable('1970-01-01 18:00:00'),
            1,
        ));

        $result = $this->generator->generate($job, '2026-09', [$entry]);

        self::assertStringStartsWith('%PDF', $result['binary']);
        self::assertStringContainsString('feuille-heures-2026-09', $result['filename']);
        self::assertStringContainsString('jean-dupont', $result['filename']);
        self::assertStringEndsWith('.pdf', $result['filename']);
    }
}
