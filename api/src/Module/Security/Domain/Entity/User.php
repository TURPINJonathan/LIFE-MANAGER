<?php

declare(strict_types=1);

namespace App\Module\Security\Domain\Entity;

use App\Module\Security\Domain\Enum\UserRole;
use App\Module\Security\Repository\UserRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\UserInterface;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: UserRepository::class)]
#[ORM\Table(name: 'app_user')]
#[ORM\UniqueConstraint(name: 'uniq_app_user_email', columns: ['email'])]
class User implements UserInterface, PasswordAuthenticatedUserInterface
{
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    #[ORM\Column(length: 180)]
    private string $email;

    #[ORM\Column]
    private string $password;

    /**
     * @var list<string>
     */
    #[ORM\Column(type: Types::JSON)]
    private array $roles;

    #[ORM\Column(length: 100)]
    private string $firstName;

    #[ORM\Column(length: 100)]
    private string $lastName;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    /**
     * @param list<UserRole> $roles
     */
    public function __construct(
        string $email,
        string $password,
        string $firstName,
        string $lastName,
        array $roles,
    ) {
        $this->id = Uuid::v7();
        $this->email = mb_strtolower(trim($email));
        $this->password = $password;
        $this->firstName = trim($firstName);
        $this->lastName = trim($lastName);
        $this->roles = array_values(array_unique(array_map(
            static fn (UserRole $role): string => $role->value,
            $roles,
        )));
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getEmail(): string
    {
        return $this->email;
    }

    public function getPassword(): string
    {
        return $this->password;
    }

    public function assignHashedPassword(string $hashedPassword): void
    {
        $this->password = $hashedPassword;
    }

    public function getFirstName(): string
    {
        return $this->firstName;
    }

    public function getLastName(): string
    {
        return $this->lastName;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    /**
     * @return list<string>
     */
    public function getRoles(): array
    {
        $roles = $this->roles;
        $roles[] = UserRole::User->value;

        return array_values(array_unique($roles));
    }

    public function getUserIdentifier(): string
    {
        if ('' === $this->email) {
            throw new \LogicException('User identifier cannot be empty.');
        }

        return $this->email;
    }
}
