<?php

declare(strict_types=1);

namespace App\Module\Category\Domain\Enum;

enum CategoryKind: string
{
    case Expense = 'expense';
    case Income = 'income';
    case Both = 'both';
}
