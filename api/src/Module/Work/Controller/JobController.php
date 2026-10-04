<?php

declare(strict_types=1);

namespace App\Module\Work\Controller;

use App\Module\Work\Exception\InvalidWorkException;
use App\Module\Work\Exception\JobNotFoundException;
use App\Module\Work\Exception\WorkerNotFoundException;
use App\Module\Work\Service\JobManager;
use App\Shared\Http\JsonRequest;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class JobController extends AbstractController
{
    public function __construct(private readonly JobManager $jobs)
    {
    }

    #[Route('/api/workers/{workerId}/jobs', name: 'api_jobs_list', methods: ['GET'])]
    public function list(string $workerId): JsonResponse
    {
        try {
            return new JsonResponse($this->jobs->listForWorker($workerId));
        } catch (WorkerNotFoundException $e) {
            return JsonRequest::error($e, Response::HTTP_NOT_FOUND);
        }
    }

    #[Route('/api/workers/{workerId}/jobs', name: 'api_jobs_create', methods: ['POST'])]
    public function create(string $workerId, Request $request): JsonResponse
    {
        $data = JsonRequest::body($request);
        try {
            $payload = $this->jobs->createJob($workerId, [
                'title'                 => JsonRequest::requireString($data, 'title'),
                'companyName'           => JsonRequest::requireString($data, 'companyName'),
                'startDate'             => JsonRequest::requireString($data, 'startDate'),
                'grossHourlyRateCents'  => JsonRequest::requireInt($data, 'grossHourlyRateCents'),
                'contractType'          => $data['contractType'] ?? 'cdi',
                'status'                => $data['status'] ?? 'non_cadre',
                'contractWeeklyMinutes' => isset($data['contractWeeklyMinutes']) && \is_int($data['contractWeeklyMinutes'])
                    ? $data['contractWeeklyMinutes']
                    : null,
                'position'                       => isset($data['position']) && \is_int($data['position']) ? $data['position'] : 0,
                'companySiret'                   => JsonRequest::optionalString($data, 'companySiret'),
                'endDate'                        => $data['endDate'] ?? null,
                'notes'                          => JsonRequest::optionalString($data, 'notes'),
                'color'                          => JsonRequest::optionalString($data, 'color'),
                'icon'                           => JsonRequest::optionalString($data, 'icon'),
                'timeTrackingEnabled'            => $data['timeTrackingEnabled'] ?? null,
                'weekStartsOn'                   => $data['weekStartsOn'] ?? null,
                'workDaysMask'                   => $data['workDaysMask'] ?? null,
                'overtimeRateBps'                => $data['overtimeRateBps'] ?? null,
                'overtimeRate2Bps'               => $data['overtimeRate2Bps'] ?? null,
                'overtimeThresholdWeeklyMinutes' => $data['overtimeThresholdWeeklyMinutes'] ?? null,
                'employeeContributionRateBps'    => $data['employeeContributionRateBps'] ?? null,
                'pasRateBps'                     => $data['pasRateBps'] ?? null,
                'netEstimateMode'                => $data['netEstimateMode'] ?? null,
            ]);
        } catch (WorkerNotFoundException $e) {
            return JsonRequest::error($e, Response::HTTP_NOT_FOUND);
        } catch (InvalidWorkException $e) {
            return JsonRequest::error($e, Response::HTTP_BAD_REQUEST);
        }

        return new JsonResponse($payload, Response::HTTP_CREATED);
    }

    #[Route('/api/jobs/{id}', name: 'api_jobs_get', methods: ['GET'])]
    public function get(string $id): JsonResponse
    {
        try {
            return new JsonResponse($this->jobs->getJob($id));
        } catch (JobNotFoundException $e) {
            return JsonRequest::error($e, Response::HTTP_NOT_FOUND);
        }
    }

    #[Route('/api/jobs/{id}', name: 'api_jobs_update', methods: ['PATCH'])]
    public function update(string $id, Request $request): JsonResponse
    {
        $data = JsonRequest::body($request);
        try {
            return new JsonResponse($this->jobs->updateJob($id, $data));
        } catch (JobNotFoundException $e) {
            return JsonRequest::error($e, Response::HTTP_NOT_FOUND);
        } catch (InvalidWorkException $e) {
            return JsonRequest::error($e, Response::HTTP_BAD_REQUEST);
        }
    }

    #[Route('/api/jobs/{id}', name: 'api_jobs_delete', methods: ['DELETE'])]
    public function delete(string $id): JsonResponse
    {
        try {
            return new JsonResponse($this->jobs->archiveJob($id));
        } catch (JobNotFoundException $e) {
            return JsonRequest::error($e, Response::HTTP_NOT_FOUND);
        }
    }

    #[Route('/api/jobs/{id}/suggest-contribution-rate', name: 'api_jobs_suggest_contribution', methods: ['POST'])]
    public function suggestContribution(string $id): JsonResponse
    {
        try {
            return new JsonResponse($this->jobs->suggestContributionRate($id));
        } catch (JobNotFoundException $e) {
            return JsonRequest::error($e, Response::HTTP_NOT_FOUND);
        }
    }
}
