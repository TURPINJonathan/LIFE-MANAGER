<?php

declare(strict_types=1);

namespace App\Module\Security\Contract\Repository;

use App\Module\Security\Domain\Entity\User;

interface IUserRepository
{
    public function save(User $user): void;

    public function findOneByEmail(string $email): ?User;
}
