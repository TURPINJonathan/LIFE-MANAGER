<?php

declare(strict_types=1);

namespace App\Module\Security\Service;

use App\Module\Security\Contract\Repository\IUserRepository;
use App\Module\Security\Contract\Service\IUserProvisioner;
use App\Module\Security\Domain\Entity\User;
use App\Module\Security\Domain\Enum\UserRole;
use App\Module\Security\Exception\DuplicateUserEmailException;
use App\Module\Security\Exception\InvalidUserPasswordException;
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

final class UserProvisioner implements IUserProvisioner
{
    public function __construct(
        private readonly IUserRepository $users,
        private readonly UserPasswordHasherInterface $hasher,
    ) {
    }

    public function create(
        string $email,
        string $plainPassword,
        string $firstName,
        string $lastName,
        array $roles,
    ): User {
        $email = mb_strtolower(trim($email));
        $this->assertPassword($plainPassword);

        if (null !== $this->users->findOneByEmail($email)) {
            throw new DuplicateUserEmailException($email);
        }

        if ([] === $roles) {
            $roles = [UserRole::User];
        }

        $user = new User($email, '', trim($firstName), trim($lastName), $roles);
        $user->assignHashedPassword($this->hasher->hashPassword($user, $plainPassword));

        try {
            $this->users->save($user);
        } catch (UniqueConstraintViolationException) {
            throw new DuplicateUserEmailException($email);
        }

        return $user;
    }

    private function assertPassword(string $plainPassword): void
    {
        if (1 !== preg_match('/^(?=.*[A-Za-z])(?=.*\d).{12,}$/', $plainPassword)) {
            throw new InvalidUserPasswordException();
        }
    }
}
