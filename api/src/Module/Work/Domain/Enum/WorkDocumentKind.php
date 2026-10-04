<?php

declare(strict_types=1);

namespace App\Module\Work\Domain\Enum;

enum WorkDocumentKind: string
{
    case Contract = 'contract';
    case Payslip = 'payslip';
    case Other = 'other';
}
