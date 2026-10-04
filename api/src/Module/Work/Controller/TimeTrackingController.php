<?php

declare(strict_types=1);

namespace App\Module\Work\Controller;

use App\Module\Work\Exception\InvalidWorkException;
use App\Module\Work\Exception\JobNotFoundException;
use App\Module\Work\Exception\TimeEntryNotFoundException;
use App\Module\Work\Exception\TimeShortcutNotFoundException;
use App\Module\Work\Service\TimeTrackingManager;
use App\Shared\Http\JsonRequest;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class TimeTrackingController extends AbstractController
{
    public function __construct(private readonly TimeTrackingManager $time)
    {
    }

    #[Route('/api/jobs/{jobId}/time-entries', name: 'api_time_entries_list', methods: ['GET'])]
    public function listEntries(string $jobId, Request $request): JsonResponse
    {
        $from = (string) $request->query->get('from', '');
        $to = (string) $request->query->get('to', '');
        try {
            return new JsonResponse($this->time->listEntries($jobId, $from, $to));
        } catch (JobNotFoundException $e) {
            return JsonRequest::error($e, Response::HTTP_NOT_FOUND);
        } catch (InvalidWorkException $e) {
            return JsonRequest::error($e, Response::HTTP_BAD_REQUEST);
        }
    }

    #[Route('/api/jobs/{jobId}/time-entries', name: 'api_time_entries_upsert', methods: ['POST'])]
    public function upsertEntry(string $jobId, Request $request): JsonResponse
    {
        $data = JsonRequest::body($request);
        try {
            $segments = $data['segments'] ?? null;
            if (!\is_array($segments)) {
                throw new InvalidWorkException('Le champ "segments" est requis.');
            }
            /** @var list<array{start: string, end: string}> $segmentList */
            $segmentList = array_values($segments);
            $payload = $this->time->upsertEntry($jobId, [
                'workDate'              => JsonRequest::requireString($data, 'workDate'),
                'segments'              => $segmentList,
                'pauseMinutes'          => isset($data['pauseMinutes']) && \is_int($data['pauseMinutes']) ? $data['pauseMinutes'] : 0,
                'notes'                 => JsonRequest::optionalString($data, 'notes'),
                'workedMinutesOverride' => \array_key_exists('workedMinutesOverride', $data)
                    ? (null === $data['workedMinutesOverride'] ? null : (int) $data['workedMinutesOverride'])
                    : null,
            ]);
        } catch (JobNotFoundException $e) {
            return JsonRequest::error($e, Response::HTTP_NOT_FOUND);
        } catch (InvalidWorkException $e) {
            return JsonRequest::error($e, Response::HTTP_BAD_REQUEST);
        }

        return new JsonResponse($payload, Response::HTTP_CREATED);
    }

    #[Route('/api/time-entries/{id}', name: 'api_time_entries_update', methods: ['PATCH'])]
    public function updateEntry(string $id, Request $request): JsonResponse
    {
        $data = JsonRequest::body($request);
        try {
            return new JsonResponse($this->time->updateEntry($id, $data));
        } catch (TimeEntryNotFoundException $e) {
            return JsonRequest::error($e, Response::HTTP_NOT_FOUND);
        } catch (InvalidWorkException $e) {
            return JsonRequest::error($e, Response::HTTP_BAD_REQUEST);
        }
    }

    #[Route('/api/time-entries/{id}', name: 'api_time_entries_delete', methods: ['DELETE'])]
    public function deleteEntry(string $id): JsonResponse
    {
        try {
            $this->time->deleteEntry($id);

            return new JsonResponse(null, Response::HTTP_NO_CONTENT);
        } catch (TimeEntryNotFoundException $e) {
            return JsonRequest::error($e, Response::HTTP_NOT_FOUND);
        }
    }

    #[Route('/api/jobs/{jobId}/time-stats', name: 'api_time_stats', methods: ['GET'])]
    public function stats(string $jobId, Request $request): JsonResponse
    {
        $from = (string) $request->query->get('from', '');
        $to = (string) $request->query->get('to', '');
        try {
            return new JsonResponse($this->time->stats($jobId, $from, $to));
        } catch (JobNotFoundException $e) {
            return JsonRequest::error($e, Response::HTTP_NOT_FOUND);
        } catch (InvalidWorkException $e) {
            return JsonRequest::error($e, Response::HTTP_BAD_REQUEST);
        }
    }

    #[Route('/api/jobs/{jobId}/timesheet.pdf', name: 'api_job_timesheet_pdf', methods: ['GET'])]
    public function timesheetPdf(string $jobId, Request $request): Response
    {
        $yearMonth = (string) $request->query->get('yearMonth', '');
        try {
            return $this->time->timesheetPdf($jobId, $yearMonth);
        } catch (JobNotFoundException $e) {
            return JsonRequest::error($e, Response::HTTP_NOT_FOUND);
        } catch (InvalidWorkException $e) {
            return JsonRequest::error($e, Response::HTTP_BAD_REQUEST);
        }
    }

    #[Route('/api/jobs/{jobId}/timesheet-blank.pdf', name: 'api_job_timesheet_blank_pdf', methods: ['GET'])]
    public function timesheetBlankPdf(string $jobId, Request $request): Response
    {
        $yearMonth = (string) $request->query->get('yearMonth', '');
        try {
            return $this->time->timesheetBlankPdf($jobId, $yearMonth);
        } catch (JobNotFoundException $e) {
            return JsonRequest::error($e, Response::HTTP_NOT_FOUND);
        } catch (InvalidWorkException $e) {
            return JsonRequest::error($e, Response::HTTP_BAD_REQUEST);
        }
    }

    #[Route('/api/jobs/{jobId}/time-shortcuts', name: 'api_time_shortcuts_list', methods: ['GET'])]
    public function listShortcuts(string $jobId): JsonResponse
    {
        try {
            return new JsonResponse($this->time->listShortcuts($jobId));
        } catch (JobNotFoundException $e) {
            return JsonRequest::error($e, Response::HTTP_NOT_FOUND);
        }
    }

    #[Route('/api/jobs/{jobId}/time-shortcuts', name: 'api_time_shortcuts_create', methods: ['POST'])]
    public function createShortcut(string $jobId, Request $request): JsonResponse
    {
        $data = JsonRequest::body($request);
        try {
            $segments = $data['segments'] ?? null;
            if (!\is_array($segments)) {
                throw new InvalidWorkException('Le champ "segments" est requis.');
            }
            /** @var list<array{start: string, end: string}> $segmentList */
            $segmentList = array_values($segments);
            $payload = $this->time->createShortcut($jobId, [
                'label'        => JsonRequest::requireString($data, 'label'),
                'segments'     => $segmentList,
                'pauseMinutes' => isset($data['pauseMinutes']) && \is_int($data['pauseMinutes']) ? $data['pauseMinutes'] : 0,
                'position'     => isset($data['position']) && \is_int($data['position']) ? $data['position'] : 0,
            ]);
        } catch (JobNotFoundException $e) {
            return JsonRequest::error($e, Response::HTTP_NOT_FOUND);
        } catch (InvalidWorkException $e) {
            return JsonRequest::error($e, Response::HTTP_BAD_REQUEST);
        }

        return new JsonResponse($payload, Response::HTTP_CREATED);
    }

    #[Route('/api/time-shortcuts/{id}', name: 'api_time_shortcuts_update', methods: ['PATCH'])]
    public function updateShortcut(string $id, Request $request): JsonResponse
    {
        $data = JsonRequest::body($request);
        try {
            return new JsonResponse($this->time->updateShortcut($id, $data));
        } catch (TimeShortcutNotFoundException $e) {
            return JsonRequest::error($e, Response::HTTP_NOT_FOUND);
        } catch (InvalidWorkException $e) {
            return JsonRequest::error($e, Response::HTTP_BAD_REQUEST);
        }
    }

    #[Route('/api/time-shortcuts/{id}', name: 'api_time_shortcuts_delete', methods: ['DELETE'])]
    public function deleteShortcut(string $id): JsonResponse
    {
        try {
            $this->time->deleteShortcut($id);

            return new JsonResponse(null, Response::HTTP_NO_CONTENT);
        } catch (TimeShortcutNotFoundException $e) {
            return JsonRequest::error($e, Response::HTTP_NOT_FOUND);
        }
    }
}
