<?php

declare(strict_types=1);

namespace App\Tests\Unit\Module\Account\Service;

use App\Module\Account\Domain\Entity\Account;
use App\Module\Account\Domain\Entity\SubAccount;
use App\Module\Account\Domain\Entity\Transaction;
use App\Module\Account\Domain\Enum\PaymentMethod;
use App\Module\Account\Repository\TransactionRepository;
use App\Module\Account\Service\BalanceCalculator;
use App\Module\Category\Domain\Entity\Category;
use App\Module\Category\Domain\Enum\CategoryKind;
use App\Module\Security\Domain\Entity\User;
use App\Module\Security\Domain\Enum\UserRole;
use PHPUnit\Framework\TestCase;

final class BalanceCalculatorTest extends TestCase
{
    public function testRunningBalanceUsesOpeningThenChronologicalAmounts(): void
    {
        $user = new User('ada@example.test', 'hash', 'Ada', 'Lovelace', [UserRole::User]);
        $account = new Account($user, 'Comptes Ada');
        $sub = new SubAccount($account, 'Courant', 'account_balance', '#2563EB', 10_000);
        $category = new Category($user, 'Courses', 'shopping_cart', '#16A34A', CategoryKind::Expense);

        $t1 = new Transaction(
            $sub,
            $category,
            new \DateTimeImmutable('2026-01-02'),
            new \DateTimeImmutable('2026-01-02'),
            PaymentMethod::Card,
            'Courses',
            -2_500,
        );
        $t2 = new Transaction(
            $sub,
            $category,
            new \DateTimeImmutable('2026-01-01'),
            new \DateTimeImmutable('2026-01-01'),
            PaymentMethod::Transfer,
            'Salaire',
            5_000,
        );

        $repo = $this->createMock(TransactionRepository::class);
        $repo->method('listForSubAccount')->willReturn([$t2, $t1]);
        $repo->method('sumAmountCents')->willReturn(2_500);

        $calculator = new BalanceCalculator($repo);

        self::assertSame(12_500, $calculator->currentBalanceCents($sub));

        $rows = $calculator->withRunningBalances($sub);
        self::assertCount(2, $rows);
        self::assertSame(15_000, $rows[0]['balanceAfterCents']);
        self::assertSame(12_500, $rows[1]['balanceAfterCents']);
    }

    public function testPendingOperationsContributeToProvisionalRunningBalance(): void
    {
        $user = new User('ada@example.test', 'hash', 'Ada', 'Lovelace', [UserRole::User]);
        $account = new Account($user, 'Comptes Ada');
        $sub = new SubAccount($account, 'Courant', 'account_balance', '#2563EB', 10_000);
        $category = new Category($user, 'Courses', 'shopping_cart', '#16A34A', CategoryKind::Expense);

        $settled = new Transaction(
            $sub,
            $category,
            new \DateTimeImmutable('2026-01-01'),
            new \DateTimeImmutable('2026-01-01'),
            PaymentMethod::Transfer,
            'Salaire',
            5_000,
        );
        $pending = new Transaction(
            $sub,
            $category,
            new \DateTimeImmutable('2026-01-03'),
            null,
            PaymentMethod::Card,
            'Courses',
            -2_500,
        );

        $repo = $this->createMock(TransactionRepository::class);
        $repo->method('listForSubAccount')->willReturn([$settled, $pending]);
        $repo->method('sumAmountCents')->willReturn(5_000);
        $repo->method('sumAllAmountCents')->willReturn(2_500);

        $calculator = new BalanceCalculator($repo);

        self::assertSame(15_000, $calculator->currentBalanceCents($sub));
        self::assertSame(12_500, $calculator->provisionalBalanceCents($sub));

        $rows = $calculator->withRunningBalances($sub);
        self::assertCount(2, $rows);
        self::assertSame(15_000, $rows[0]['balanceAfterCents']);
        self::assertSame(12_500, $rows[1]['balanceAfterCents']);
    }
}
