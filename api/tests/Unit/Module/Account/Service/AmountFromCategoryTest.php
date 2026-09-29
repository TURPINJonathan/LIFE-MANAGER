<?php

declare(strict_types=1);

namespace App\Tests\Unit\Module\Account\Service;

use App\Module\Account\Exception\InvalidTransactionException;
use App\Module\Account\Service\AmountFromCategory;
use App\Module\Category\Domain\Entity\Category;
use App\Module\Category\Domain\Enum\CategoryKind;
use App\Module\Security\Domain\Entity\User;
use App\Module\Security\Domain\Enum\UserRole;
use PHPUnit\Framework\TestCase;

final class AmountFromCategoryTest extends TestCase
{
    public function testExpenseIsNegativeAndIncomeIsPositive(): void
    {
        $user = new User('ada@example.test', 'hash', 'Ada', 'Lovelace', [UserRole::User]);
        $expense = new Category($user, 'Courses', 'shopping_cart', '#16A34A', CategoryKind::Expense);
        $income = new Category($user, 'Salaire', 'payments', '#2563EB', CategoryKind::Income);

        self::assertSame(-2_500, AmountFromCategory::signedCents($expense, 2_500));
        self::assertSame(2_500, AmountFromCategory::signedCents($income, 2_500));
    }

    public function testBothRequiresFlow(): void
    {
        $user = new User('ada@example.test', 'hash', 'Ada', 'Lovelace', [UserRole::User]);
        $both = new Category($user, 'Divers', 'category', '#475569', CategoryKind::Both);

        self::assertSame(1_000, AmountFromCategory::signedCents($both, 1_000, 'credit'));
        self::assertSame(-1_000, AmountFromCategory::signedCents($both, 1_000, 'debit'));

        $this->expectException(InvalidTransactionException::class);
        AmountFromCategory::signedCents($both, 1_000);
    }

    public function testZeroAllowedOnlyWhenRequested(): void
    {
        $user = new User('ada@example.test', 'hash', 'Ada', 'Lovelace', [UserRole::User]);
        $expense = new Category($user, 'Courses', 'shopping_cart', '#16A34A', CategoryKind::Expense);

        self::assertSame(0, AmountFromCategory::signedCents($expense, 0, null, true));
        self::assertTrue(AmountFromCategory::isExpense($expense));

        $this->expectException(InvalidTransactionException::class);
        AmountFromCategory::signedCents($expense, 0);
    }
}
