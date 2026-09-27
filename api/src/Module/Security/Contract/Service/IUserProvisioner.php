<?php

declare(strict_types=1);

namespace App\Module\Security\Contract\Service;

use App\Module\Security\Domain\Entity\User;
use App\Module\Security\Domain\Enum\UserRole;

interface IUserProvisioner
{
    /**
     * @param list<UserRole> $roles
     */
    public function create(
        string $email,
        string $plainPassword,
        string $firstName,
        string $lastName,
        array $roles,
    ): User;
}
