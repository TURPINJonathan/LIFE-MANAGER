<?php

declare(strict_types=1);

namespace App\Module\Work\Domain\Enum;

enum NetEstimateMode: string
{
    case Params = 'params';
    case External = 'external';
}
