<?php

declare(strict_types=1);

namespace App\Tests\Unit\Module\Security\Domain\Entity;

use App\Module\Security\Domain\Entity\User;
use App\Module\Security\Domain\Enum\UserRole;
use PHPUnit\Framework\TestCase;

final class UserTest extends TestCase
{
    public function testIdentifierIsNormalizedAndUserRoleIsAlwaysPresent(): void
    {
        $user = new User('Ada@Example.test', 'hash', 'Ada', 'Lovelace', [UserRole::Admin]);

        self::assertSame('ada@example.test', $user->getUserIdentifier());
        self::assertContains(UserRole::Admin->value, $user->getRoles());
        self::assertContains(UserRole::User->value, $user->getRoles());
        self::assertSame('Ada', $user->getFirstName());
    }
}
