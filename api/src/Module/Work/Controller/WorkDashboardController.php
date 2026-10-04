<?php

declare(strict_types=1);

namespace App\Module\Work\Controller;

use App\Module\Work\Service\WorkDashboardManager;
use App\Shared\Http\JsonRequest;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class WorkDashboardController extends AbstractController
{
    public function __construct(private readonly WorkDashboardManager $dashboard)
    {
    }

    #[Route('/api/work-stats/dashboard', name: 'api_work_stats_dashboard', methods: ['GET'])]
    public function dashboard(Request $request): JsonResponse
    {
        $yearMonth = $request->query->getString('yearMonth');
        if ('' === $yearMonth) {
            $yearMonth = (new \DateTimeImmutable())->format('Y-m');
        }

        try {
            return new JsonResponse($this->dashboard->dashboard($yearMonth));
        } catch (\InvalidArgumentException $e) {
            return JsonRequest::error($e, Response::HTTP_BAD_REQUEST);
        }
    }
}
