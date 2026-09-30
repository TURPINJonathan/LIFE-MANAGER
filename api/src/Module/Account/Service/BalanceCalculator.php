<?php

declare(strict_types=1);

namespace App\Module\Account\Service;

use App\Module\Account\Domain\Entity\SubAccount;
use App\Module\Account\Domain\Entity\Transaction;
use App\Module\Account\Repository\TransactionRepository;

final class BalanceCalculator
{
    public function __construct(private readonly TransactionRepository $transactions)
    {
    }

    /** Solde confirmé : ouverture + opérations pointées uniquement. */
    public function currentBalanceCents(SubAccount $subAccount): int
    {
        return $subAccount->getOpeningBalanceCents() + $this->transactions->sumAmountCents($subAccount);
    }

    /** Solde provisoire : ouverture + toutes les opérations (pointées et en attente). */
    public function provisionalBalanceCents(SubAccount $subAccount): int
    {
        return $subAccount->getOpeningBalanceCents() + $this->transactions->sumAllAmountCents($subAccount);
    }

    /**
     * Solde courant après chaque ligne (provisoire pour les opérations sans date effective).
     *
     * @return list<array{transaction: Transaction, balanceAfterCents: int}>
     */
    public function withRunningBalances(SubAccount $subAccount): array
    {
        $balance = $subAccount->getOpeningBalanceCents();
        $rows = [];

        foreach ($this->transactions->listForSubAccount($subAccount) as $transaction) {
            $balance += $transaction->getAmountCents();
            $rows[] = [
                'transaction'       => $transaction,
                'balanceAfterCents' => $balance,
            ];
        }

        return $rows;
    }
}
