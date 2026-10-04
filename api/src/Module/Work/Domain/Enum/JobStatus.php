<?php

declare(strict_types=1);

namespace App\Module\Work\Domain\Enum;

enum JobStatus: string
{
    case NonCadre = 'non_cadre';
    case Cadre = 'cadre';
}
