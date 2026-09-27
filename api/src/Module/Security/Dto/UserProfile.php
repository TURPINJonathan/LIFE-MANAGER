<?php

declare(strict_types=1);

namespace App\Module\Security\Dto;

use App\Module\Security\Domain\Entity\User;

final readonly class UserProfile
{
    /**
     * @param list<string> $roles
     */
    public function __construct(
        public string $id,
        public string $email,
        public string $firstName,
        public string $lastName,
        public array $roles,
    ) {
    }

    public static function fromUser(User $user): self
    {
        return new self(
            (string) $user->getId(),
            $user->getEmail(),
            $user->getFirstName(),
            $user->getLastName(),
            $user->getRoles(),
        );
    }

    /**
     * @return array{id: string, email: string, firstName: string, lastName: string, roles: list<string>}
     */
    public function toArray(): array
    {
        return [
            'id'        => $this->id,
            'email'     => $this->email,
            'firstName' => $this->firstName,
            'lastName'  => $this->lastName,
            'roles'     => $this->roles,
        ];
    }
}
