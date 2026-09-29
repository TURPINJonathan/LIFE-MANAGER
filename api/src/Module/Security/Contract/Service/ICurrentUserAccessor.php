<?php

declare(strict_types=1);

namespace App\Module\Security\Contract\Service;

use App\Module\Security\Domain\Entity\User;

interface ICurrentUserAccessor
{
    public function requireUser(): User;
}
