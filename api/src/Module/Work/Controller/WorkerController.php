<?php

declare(strict_types=1);

namespace App\Module\Work\Controller;

use App\Module\Work\Exception\InvalidWorkException;
use App\Module\Work\Exception\WorkerNotFoundException;
use App\Module\Work\Service\WorkerManager;
use App\Shared\Http\JsonRequest;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class WorkerController extends AbstractController
{
    public function __construct(private readonly WorkerManager $workers)
    {
    }

    #[Route('/api/workers', name: 'api_workers_list', methods: ['GET'])]
    public function list(): JsonResponse
    {
        return new JsonResponse($this->workers->listWorkers());
    }

    #[Route('/api/workers', name: 'api_workers_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $data = JsonRequest::body($request);
        try {
            $payload = $this->workers->createWorker([
                'firstName' => JsonRequest::requireString($data, 'firstName'),
                'lastName'  => \is_string($data['lastName'] ?? null) ? trim($data['lastName']) : '',
                'notes'     => JsonRequest::optionalString($data, 'notes'),
                'position'  => isset($data['position']) && \is_int($data['position']) ? $data['position'] : 0,
            ]);
        } catch (InvalidWorkException $e) {
            return JsonRequest::error($e, Response::HTTP_BAD_REQUEST);
        }

        return new JsonResponse($payload, Response::HTTP_CREATED);
    }

    #[Route('/api/workers/{id}', name: 'api_workers_get', methods: ['GET'])]
    public function get(string $id): JsonResponse
    {
        try {
            return new JsonResponse($this->workers->getWorker($id));
        } catch (WorkerNotFoundException $e) {
            return JsonRequest::error($e, Response::HTTP_NOT_FOUND);
        }
    }

    #[Route('/api/workers/{id}', name: 'api_workers_update', methods: ['PATCH'])]
    public function update(string $id, Request $request): JsonResponse
    {
        $data = JsonRequest::body($request);
        $patch = [];
        if (isset($data['firstName'])) {
            $patch['firstName'] = JsonRequest::requireString($data, 'firstName');
        }
        if (\array_key_exists('lastName', $data)) {
            $patch['lastName'] = \is_string($data['lastName']) ? trim($data['lastName']) : '';
        }
        if (\array_key_exists('notes', $data)) {
            $patch['notes'] = JsonRequest::optionalString($data, 'notes');
        }
        if (isset($data['position']) && \is_int($data['position'])) {
            $patch['position'] = $data['position'];
        }

        try {
            return new JsonResponse($this->workers->updateWorker($id, $patch));
        } catch (WorkerNotFoundException $e) {
            return JsonRequest::error($e, Response::HTTP_NOT_FOUND);
        } catch (InvalidWorkException $e) {
            return JsonRequest::error($e, Response::HTTP_BAD_REQUEST);
        }
    }

    #[Route('/api/workers/{id}', name: 'api_workers_delete', methods: ['DELETE'])]
    public function delete(string $id): JsonResponse
    {
        try {
            return new JsonResponse($this->workers->archiveWorker($id));
        } catch (WorkerNotFoundException $e) {
            return JsonRequest::error($e, Response::HTTP_NOT_FOUND);
        }
    }
}
