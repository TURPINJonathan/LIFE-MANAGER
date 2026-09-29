<?php

declare(strict_types=1);

namespace App\Module\Account\Domain\Enum;

enum PaymentMethod: string
{
    case Card = 'card';
    case Check = 'check';
    case Transfer = 'transfer';
    case DirectDebit = 'direct_debit';
    case Cash = 'cash';
    case Deposit = 'deposit';
}
