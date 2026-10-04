<?php

declare(strict_types=1);

namespace App\Module\Work\Domain\Enum;

enum ContractType: string
{
    case Cdi = 'cdi';
    case Cdd = 'cdd';
    case Interim = 'interim';
    case Apprenticeship = 'apprenticeship';
    case Other = 'other';
}
