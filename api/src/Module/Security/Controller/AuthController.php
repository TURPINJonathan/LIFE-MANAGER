<?php

declare(strict_types=1);

namespace App\Module\Security\Controller;

use App\Module\Security\Contract\Service\ICurrentUserProfileProvider;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

final class AuthController extends AbstractController
{
    #[Route('/api/login', name: 'api_login', methods: ['POST'])]
    public function login(): JsonResponse
    {
        throw new \LogicException('Cette route est interceptée par json_login.');
    }

    #[Route('/api/me', name: 'api_me', methods: ['GET'])]
    public function me(ICurrentUserProfileProvider $profiles): JsonResponse
    {
        return new JsonResponse($profiles->current()->toArray());
    }
}
