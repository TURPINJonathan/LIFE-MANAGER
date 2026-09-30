<?php

declare(strict_types=1);

namespace App\Module\Merchant\Controller;

use App\Module\Category\Exception\CategoryNotFoundException;
use App\Module\Merchant\Exception\MerchantInUseException;
use App\Module\Merchant\Exception\MerchantNotFoundException;
use App\Module\Merchant\Service\MerchantManager;
use App\Shared\Http\JsonRequest;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class MerchantController extends AbstractController
{
    public function __construct(private readonly MerchantManager $merchants)
    {
    }

    #[Route('/api/merchants', name: 'api_merchants_list', methods: ['GET'])]
    public function list(): JsonResponse
    {
        return new JsonResponse($this->merchants->list());
    }

    #[Route('/api/merchants', name: 'api_merchants_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $data = JsonRequest::body($request);

        try {
            $payload = [
                'name'     => JsonRequest::requireString($data, 'name'),
                'color'    => JsonRequest::requireString($data, 'color'),
                'icon'     => JsonRequest::requireString($data, 'icon'),
                'position' => isset($data['position']) && \is_int($data['position']) ? $data['position'] : 0,
            ];
            if (\array_key_exists('categoryIds', $data)) {
                $payload['categoryIds'] = JsonRequest::requireStringList($data, 'categoryIds');
            }
            $created = $this->merchants->create($payload);
        } catch (CategoryNotFoundException $e) {
            return JsonRequest::error($e, Response::HTTP_BAD_REQUEST);
        } catch (\InvalidArgumentException $e) {
            return JsonRequest::error($e, Response::HTTP_BAD_REQUEST);
        }

        return new JsonResponse($created, Response::HTTP_CREATED);
    }

    #[Route('/api/merchants/{id}', name: 'api_merchants_update', methods: ['PATCH'])]
    public function update(string $id, Request $request): JsonResponse
    {
        $data = JsonRequest::body($request);
        $patch = [];
        if (isset($data['name'])) {
            $patch['name'] = JsonRequest::requireString($data, 'name');
        }
        if (isset($data['color'])) {
            $patch['color'] = JsonRequest::requireString($data, 'color');
        }
        if (isset($data['icon'])) {
            $patch['icon'] = JsonRequest::requireString($data, 'icon');
        }
        if (isset($data['position']) && \is_int($data['position'])) {
            $patch['position'] = $data['position'];
        }
        if (\array_key_exists('categoryIds', $data)) {
            $patch['categoryIds'] = JsonRequest::requireStringList($data, 'categoryIds');
        }

        try {
            return new JsonResponse($this->merchants->update($id, $patch));
        } catch (MerchantNotFoundException $e) {
            return JsonRequest::error($e, Response::HTTP_NOT_FOUND);
        } catch (CategoryNotFoundException $e) {
            return JsonRequest::error($e, Response::HTTP_BAD_REQUEST);
        } catch (\InvalidArgumentException $e) {
            return JsonRequest::error($e, Response::HTTP_BAD_REQUEST);
        }
    }

    #[Route('/api/merchants/{id}', name: 'api_merchants_delete', methods: ['DELETE'])]
    public function delete(string $id): JsonResponse
    {
        try {
            return new JsonResponse($this->merchants->archive($id));
        } catch (MerchantNotFoundException $e) {
            return JsonRequest::error($e, Response::HTTP_NOT_FOUND);
        } catch (MerchantInUseException $e) {
            return JsonRequest::error($e, Response::HTTP_CONFLICT);
        }
    }

    #[Route('/api/merchants/{id}/image', name: 'api_merchants_upload_image', methods: ['POST'])]
    public function uploadImage(string $id, Request $request): JsonResponse
    {
        $file = $request->files->get('file');
        if (!$file instanceof UploadedFile) {
            return JsonRequest::error(new \InvalidArgumentException('Le champ "file" est requis.'), Response::HTTP_BAD_REQUEST);
        }

        try {
            return new JsonResponse($this->merchants->uploadImage($id, $file));
        } catch (MerchantNotFoundException $e) {
            return JsonRequest::error($e, Response::HTTP_NOT_FOUND);
        } catch (\InvalidArgumentException $e) {
            return JsonRequest::error($e, Response::HTTP_BAD_REQUEST);
        }
    }

    #[Route('/api/merchants/{id}/image', name: 'api_merchants_get_image', methods: ['GET'])]
    public function getImage(string $id): Response
    {
        try {
            return $this->merchants->streamImage($id);
        } catch (MerchantNotFoundException $e) {
            return JsonRequest::error($e, Response::HTTP_NOT_FOUND);
        }
    }

    #[Route('/api/merchants/{id}/image', name: 'api_merchants_delete_image', methods: ['DELETE'])]
    public function deleteImage(string $id): JsonResponse
    {
        try {
            return new JsonResponse($this->merchants->clearImage($id));
        } catch (MerchantNotFoundException $e) {
            return JsonRequest::error($e, Response::HTTP_NOT_FOUND);
        } catch (\InvalidArgumentException $e) {
            return JsonRequest::error($e, Response::HTTP_BAD_REQUEST);
        }
    }
}
