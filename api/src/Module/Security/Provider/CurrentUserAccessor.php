<?php

declare(strict_types=1);

namespace App\Module\Security\Provider;

use App\Module\Security\Contract\Service\ICurrentUserAccessor;
use App\Module\Security\Domain\Entity\User;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;

final class CurrentUserAccessor implements ICurrentUserAccessor
{
    public function __construct(private readonly Security $security)
    {
    }

    public function requireUser(): User
    {
        $user = $this->security->getUser();
        if (!$user instanceof User) {
            throw new AccessDeniedException('Authentification requise.');
        }

        return $user;
    }
}
