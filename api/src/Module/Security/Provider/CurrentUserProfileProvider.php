<?php

declare(strict_types=1);

namespace App\Module\Security\Provider;

use App\Module\Security\Contract\Service\ICurrentUserProfileProvider;
use App\Module\Security\Domain\Entity\User;
use App\Module\Security\Dto\UserProfile;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;

final class CurrentUserProfileProvider implements ICurrentUserProfileProvider
{
    public function __construct(private readonly Security $security)
    {
    }

    public function current(): UserProfile
    {
        $user = $this->security->getUser();
        if (!$user instanceof User) {
            throw new AccessDeniedException('Authentification requise.');
        }

        return UserProfile::fromUser($user);
    }
}
