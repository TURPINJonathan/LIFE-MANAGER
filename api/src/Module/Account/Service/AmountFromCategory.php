<?php

declare(strict_types=1);

namespace App\Module\Account\Service;

use App\Module\Account\Exception\InvalidTransactionException;
use App\Module\Category\Domain\Entity\Category;
use App\Module\Category\Domain\Enum\CategoryKind;

final class AmountFromCategory
{
    /**
     * Le client envoie un montant absolu (>= 0 si $allowZero, sinon > 0).
     * Le signe vient du type de catégorie. Pour `both`, `$flow` doit être `credit` ou `debit`.
     */
    public static function signedCents(
        Category $category,
        int $absoluteCents,
        ?string $flow = null,
        bool $allowZero = false,
    ): int {
        if ($absoluteCents < 0 || (!$allowZero && 0 === $absoluteCents)) {
            throw new InvalidTransactionException($allowZero ? 'Le montant doit être un entier positif ou nul.' : 'Le montant doit être un entier strictement positif.');
        }

        if (0 === $absoluteCents) {
            self::assertFlow($category, $flow);

            return 0;
        }

        return match ($category->getKind()) {
            CategoryKind::Expense => -$absoluteCents,
            CategoryKind::Income  => $absoluteCents,
            CategoryKind::Both    => match ($flow) {
                'credit' => $absoluteCents,
                'debit'  => -$absoluteCents,
                default  => throw new InvalidTransactionException('Pour une catégorie mixte, indiquez flow: "credit" ou "debit".'),
            },
        };
    }

    /** Sens dépense (utile quand le planifié est à 0 €). */
    public static function isExpense(Category $category, ?string $flow = null): bool
    {
        return match ($category->getKind()) {
            CategoryKind::Expense => true,
            CategoryKind::Income  => false,
            CategoryKind::Both    => match ($flow) {
                'debit'  => true,
                'credit' => false,
                default  => throw new InvalidTransactionException('Pour une catégorie mixte, indiquez flow: "credit" ou "debit".'),
            },
        };
    }

    private static function assertFlow(Category $category, ?string $flow): void
    {
        if (CategoryKind::Both !== $category->getKind()) {
            return;
        }
        if ('credit' !== $flow && 'debit' !== $flow) {
            throw new InvalidTransactionException('Pour une catégorie mixte, indiquez flow: "credit" ou "debit".');
        }
    }
}
