<?php

declare(strict_types=1);

namespace App\Module\Security\Contract\Service;

use App\Module\Security\Dto\UserProfile;

interface ICurrentUserProfileProvider
{
    public function current(): UserProfile;
}
