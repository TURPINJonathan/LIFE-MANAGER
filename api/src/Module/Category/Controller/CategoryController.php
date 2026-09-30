<?php

declare(strict_types=1);

namespace App\Module\Category\Controller;

use App\Module\Category\Exception\CategoryInUseException;
use App\Module\Category\Exception\CategoryNotFoundException;
use App\Module\Category\Service\CategoryManager;
use App\Module\Merchant\Exception\MerchantNotFoundException;
use App\Shared\Http\JsonRequest;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class CategoryController extends AbstractController
{
    public function __construct(private readonly CategoryManager $categories)
    {
    }

    #[Route('/api/categories', name: 'api_categories_list', methods: ['GET'])]
    public function list(): JsonResponse
    {
        return new JsonResponse($this->categories->list());
    }

    #[Route('/api/categories', name: 'api_categories_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $data = JsonRequest::body($request);

        try {
            $payload = [
                'name'     => JsonRequest::requireString($data, 'name'),
                'icon'     => JsonRequest::requireString($data, 'icon'),
                'color'    => JsonRequest::requireString($data, 'color'),
                'kind'     => JsonRequest::requireString($data, 'kind'),
                'position' => isset($data['position']) && \is_int($data['position']) ? $data['position'] : 0,
            ];
            if (\array_key_exists('merchantIds', $data)) {
                $payload['merchantIds'] = JsonRequest::requireStringList($data, 'merchantIds');
            }
            if (\array_key_exists('favoriteMerchantId', $data)) {
                $payload['favoriteMerchantId'] = JsonRequest::optionalString($data, 'favoriteMerchantId');
            }
            $created = $this->categories->create($payload);
        } catch (\ValueError) {
            return JsonRequest::error(new \InvalidArgumentException('Type de catégorie invalide.'), Response::HTTP_BAD_REQUEST);
        } catch (MerchantNotFoundException $e) {
            return JsonRequest::error($e, Response::HTTP_BAD_REQUEST);
        } catch (\InvalidArgumentException $e) {
            return JsonRequest::error($e, Response::HTTP_BAD_REQUEST);
        }

        return new JsonResponse($created, Response::HTTP_CREATED);
    }

    #[Route('/api/categories/{id}', name: 'api_categories_update', methods: ['PATCH'])]
    public function update(string $id, Request $request): JsonResponse
    {
        $data = JsonRequest::body($request);
        $patch = [];
        if (isset($data['name'])) {
            $patch['name'] = JsonRequest::requireString($data, 'name');
        }
        if (isset($data['icon'])) {
            $patch['icon'] = JsonRequest::requireString($data, 'icon');
        }
        if (isset($data['color'])) {
            $patch['color'] = JsonRequest::requireString($data, 'color');
        }
        if (isset($data['kind'])) {
            $patch['kind'] = JsonRequest::requireString($data, 'kind');
        }
        if (isset($data['position']) && \is_int($data['position'])) {
            $patch['position'] = $data['position'];
        }
        if (\array_key_exists('merchantIds', $data)) {
            $patch['merchantIds'] = JsonRequest::requireStringList($data, 'merchantIds');
        }
        if (\array_key_exists('favoriteMerchantId', $data)) {
            $patch['favoriteMerchantId'] = JsonRequest::optionalString($data, 'favoriteMerchantId');
        }

        try {
            return new JsonResponse($this->categories->update($id, $patch));
        } catch (CategoryNotFoundException $e) {
            return JsonRequest::error($e, Response::HTTP_NOT_FOUND);
        } catch (MerchantNotFoundException $e) {
            return JsonRequest::error($e, Response::HTTP_BAD_REQUEST);
        } catch (\ValueError) {
            return JsonRequest::error(new \InvalidArgumentException('Type de catégorie invalide.'), Response::HTTP_BAD_REQUEST);
        } catch (\InvalidArgumentException $e) {
            return JsonRequest::error($e, Response::HTTP_BAD_REQUEST);
        }
    }

    #[Route('/api/categories/{id}', name: 'api_categories_delete', methods: ['DELETE'])]
    public function delete(string $id): JsonResponse
    {
        try {
            return new JsonResponse($this->categories->archive($id));
        } catch (CategoryNotFoundException $e) {
            return JsonRequest::error($e, Response::HTTP_NOT_FOUND);
        } catch (CategoryInUseException $e) {
            return JsonRequest::error($e, Response::HTTP_CONFLICT);
        }
    }
}
