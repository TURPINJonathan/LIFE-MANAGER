<?php

declare(strict_types=1);

namespace App\Module\Work\Controller;

use App\Module\Work\Exception\InvalidWorkException;
use App\Module\Work\Exception\JobNotFoundException;
use App\Module\Work\Exception\WorkPlanEntryNotFoundException;
use App\Module\Work\Service\WorkPlanManager;
use App\Shared\Http\JsonRequest;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class WorkPlanController extends AbstractController
{
    public function __construct(private readonly WorkPlanManager $plans)
    {
    }

    #[Route('/api/jobs/{jobId}/plan-entries', name: 'api_plan_entries_list', methods: ['GET'])]
    public function list(string $jobId, Request $request): JsonResponse
    {
        $from = (string) $request->query->get('from', '');
        $to = (string) $request->query->get('to', '');
        try {
            return new JsonResponse($this->plans->listEntries($jobId, $from, $to));
        } catch (JobNotFoundException $e) {
            return JsonRequest::error($e, Response::HTTP_NOT_FOUND);
        } catch (InvalidWorkException $e) {
            return JsonRequest::error($e, Response::HTTP_BAD_REQUEST);
        }
    }

    #[Route('/api/jobs/{jobId}/plan-entries', name: 'api_plan_entries_upsert', methods: ['POST'])]
    public function upsert(string $jobId, Request $request): JsonResponse
    {
        $data = JsonRequest::body($request);
        try {
            $segments = $data['segments'] ?? null;
            if (!\is_array($segments)) {
                throw new InvalidWorkException('Le champ "segments" est requis.');
            }
            /** @var list<array{start: string, end: string}> $segmentList */
            $segmentList = array_values($segments);
            $payload = $this->plans->upsertEntry($jobId, [
                'workDate'     => JsonRequest::requireString($data, 'workDate'),
                'segments'     => $segmentList,
                'pauseMinutes' => isset($data['pauseMinutes']) && \is_int($data['pauseMinutes']) ? $data['pauseMinutes'] : 0,
                'notes'        => JsonRequest::optionalString($data, 'notes'),
            ]);
        } catch (JobNotFoundException $e) {
            return JsonRequest::error($e, Response::HTTP_NOT_FOUND);
        } catch (InvalidWorkException $e) {
            return JsonRequest::error($e, Response::HTTP_BAD_REQUEST);
        }

        return new JsonResponse($payload, Response::HTTP_CREATED);
    }

    #[Route('/api/jobs/{jobId}/plan-entries/fill-month', name: 'api_plan_entries_fill_month', methods: ['POST'])]
    public function fillMonth(string $jobId, Request $request): JsonResponse
    {
        $data = JsonRequest::body($request);
        try {
            $payload = $this->plans->fillMonth($jobId, [
                'yearMonth'    => JsonRequest::requireString($data, 'yearMonth'),
                'shortcutId'   => JsonRequest::optionalString($data, 'shortcutId'),
                'segments'     => $data['segments'] ?? null,
                'pauseMinutes' => isset($data['pauseMinutes']) && \is_int($data['pauseMinutes']) ? $data['pauseMinutes'] : null,
                'overwrite'    => (bool) ($data['overwrite'] ?? false),
            ]);
        } catch (JobNotFoundException $e) {
            return JsonRequest::error($e, Response::HTTP_NOT_FOUND);
        } catch (InvalidWorkException|\InvalidArgumentException $e) {
            return JsonRequest::error($e, Response::HTTP_BAD_REQUEST);
        }

        return new JsonResponse($payload);
    }

    #[Route('/api/plan-entries/{id}', name: 'api_plan_entries_update', methods: ['PATCH'])]
    public function update(string $id, Request $request): JsonResponse
    {
        $data = JsonRequest::body($request);
        try {
            return new JsonResponse($this->plans->updateEntry($id, $data));
        } catch (WorkPlanEntryNotFoundException $e) {
            return JsonRequest::error($e, Response::HTTP_NOT_FOUND);
        } catch (InvalidWorkException $e) {
            return JsonRequest::error($e, Response::HTTP_BAD_REQUEST);
        }
    }

    #[Route('/api/plan-entries/{id}', name: 'api_plan_entries_delete', methods: ['DELETE'])]
    public function delete(string $id): JsonResponse
    {
        try {
            $this->plans->deleteEntry($id);

            return new JsonResponse(null, Response::HTTP_NO_CONTENT);
        } catch (WorkPlanEntryNotFoundException $e) {
            return JsonRequest::error($e, Response::HTTP_NOT_FOUND);
        }
    }
}
