<?php

declare(strict_types=1);

namespace App\Module\Work\Controller;

use App\Module\Work\Exception\InvalidWorkException;
use App\Module\Work\Exception\JobNotFoundException;
use App\Module\Work\Exception\WorkDocumentNotFoundException;
use App\Module\Work\Service\WorkDocumentManager;
use App\Shared\Http\JsonRequest;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class WorkDocumentController extends AbstractController
{
    public function __construct(private readonly WorkDocumentManager $documents)
    {
    }

    #[Route('/api/jobs/{jobId}/documents', name: 'api_work_documents_list', methods: ['GET'])]
    public function list(string $jobId): JsonResponse
    {
        try {
            return new JsonResponse($this->documents->listForJob($jobId));
        } catch (JobNotFoundException $e) {
            return JsonRequest::error($e, Response::HTTP_NOT_FOUND);
        }
    }

    #[Route('/api/jobs/{jobId}/documents', name: 'api_work_documents_create', methods: ['POST'])]
    public function create(string $jobId, Request $request): JsonResponse
    {
        $data = JsonRequest::body($request);
        try {
            $payload = $this->documents->create($jobId, [
                'kind'      => JsonRequest::requireString($data, 'kind'),
                'label'     => JsonRequest::requireString($data, 'label'),
                'yearMonth' => JsonRequest::optionalString($data, 'yearMonth'),
            ]);
        } catch (JobNotFoundException $e) {
            return JsonRequest::error($e, Response::HTTP_NOT_FOUND);
        } catch (InvalidWorkException $e) {
            return JsonRequest::error($e, Response::HTTP_BAD_REQUEST);
        }

        return new JsonResponse($payload, Response::HTTP_CREATED);
    }

    #[Route('/api/work-documents/{id}', name: 'api_work_documents_update', methods: ['PATCH'])]
    public function update(string $id, Request $request): JsonResponse
    {
        $data = JsonRequest::body($request);
        try {
            return new JsonResponse($this->documents->update($id, $data));
        } catch (WorkDocumentNotFoundException $e) {
            return JsonRequest::error($e, Response::HTTP_NOT_FOUND);
        } catch (InvalidWorkException $e) {
            return JsonRequest::error($e, Response::HTTP_BAD_REQUEST);
        }
    }

    #[Route('/api/work-documents/{id}', name: 'api_work_documents_delete', methods: ['DELETE'])]
    public function delete(string $id): JsonResponse
    {
        try {
            $this->documents->delete($id);

            return new JsonResponse(null, Response::HTTP_NO_CONTENT);
        } catch (WorkDocumentNotFoundException $e) {
            return JsonRequest::error($e, Response::HTTP_NOT_FOUND);
        }
    }

    #[Route('/api/work-documents/{id}/file', name: 'api_work_documents_upload_file', methods: ['POST'])]
    public function uploadFile(string $id, Request $request): JsonResponse
    {
        $file = $request->files->get('file');
        if (!$file instanceof UploadedFile) {
            return JsonRequest::error(new InvalidWorkException('Fichier requis (champ "file").'), Response::HTTP_BAD_REQUEST);
        }

        try {
            return new JsonResponse($this->documents->uploadFile($id, $file));
        } catch (WorkDocumentNotFoundException $e) {
            return JsonRequest::error($e, Response::HTTP_NOT_FOUND);
        } catch (\InvalidArgumentException $e) {
            return JsonRequest::error($e, Response::HTTP_BAD_REQUEST);
        }
    }

    #[Route('/api/work-documents/{id}/file', name: 'api_work_documents_get_file', methods: ['GET'])]
    public function getFile(string $id): Response
    {
        try {
            return $this->documents->streamFile($id);
        } catch (WorkDocumentNotFoundException $e) {
            return JsonRequest::error($e, Response::HTTP_NOT_FOUND);
        }
    }

    #[Route('/api/work-documents/{id}/file', name: 'api_work_documents_delete_file', methods: ['DELETE'])]
    public function deleteFile(string $id): JsonResponse
    {
        try {
            return new JsonResponse($this->documents->deleteFile($id));
        } catch (WorkDocumentNotFoundException $e) {
            return JsonRequest::error($e, Response::HTTP_NOT_FOUND);
        }
    }
}
