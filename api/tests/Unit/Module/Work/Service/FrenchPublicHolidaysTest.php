<?php

declare(strict_types=1);

namespace App\Tests\Unit\Module\Work\Service;

use App\Module\Work\Service\FrenchPublicHolidays;
use PHPUnit\Framework\TestCase;

final class FrenchPublicHolidaysTest extends TestCase
{
    public function testEasterSunday2026(): void
    {
        $holidays = new FrenchPublicHolidays();
        self::assertSame('2026-04-05', $holidays->easterSunday(2026)->format('Y-m-d'));
    }

    public function testFrenchHolidays2026(): void
    {
        $holidays = new FrenchPublicHolidays();
        $dates = $holidays->forYear(2026);

        self::assertContains('2026-01-01', $dates);
        self::assertContains('2026-04-06', $dates); // Lundi de Pâques
        self::assertContains('2026-05-01', $dates);
        self::assertContains('2026-05-08', $dates);
        self::assertContains('2026-05-14', $dates); // Ascension
        self::assertContains('2026-05-25', $dates); // Lundi de Pentecôte
        self::assertContains('2026-07-14', $dates);
        self::assertContains('2026-08-15', $dates);
        self::assertContains('2026-11-01', $dates);
        self::assertContains('2026-11-11', $dates);
        self::assertContains('2026-12-25', $dates);
        self::assertCount(11, $dates);
    }

    public function testIsHoliday(): void
    {
        $holidays = new FrenchPublicHolidays();
        self::assertTrue($holidays->isHoliday(new \DateTimeImmutable('2026-07-14')));
        self::assertFalse($holidays->isHoliday(new \DateTimeImmutable('2026-07-15')));
    }
}
