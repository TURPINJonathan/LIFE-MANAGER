<?php

declare(strict_types=1);

namespace App\Module\Account\Controller;

use App\Module\Account\Exception\AccountNotFoundException;
use App\Module\Account\Exception\SubAccountNotFoundException;
use App\Module\Account\Service\AccountManager;
use App\Shared\Http\JsonRequest;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class AccountController extends AbstractController
{
    public function __construct(private readonly AccountManager $accounts)
    {
    }

    #[Route('/api/accounts', name: 'api_accounts_list', methods: ['GET'])]
    public function list(): JsonResponse
    {
        return new JsonResponse($this->accounts->listAccounts());
    }

    #[Route('/api/accounts', name: 'api_accounts_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $data = JsonRequest::body($request);
        $payload = $this->accounts->createAccount([
            'name' => JsonRequest::requireString($data, 'name'),
            'notes' => JsonRequest::optionalString($data, 'notes'),
            'position' => isset($data['position']) && \is_int($data['position']) ? $data['position'] : 0,
        ]);

        return new JsonResponse($payload, Response::HTTP_CREATED);
    }

    #[Route('/api/accounts/{id}', name: 'api_accounts_get', methods: ['GET'])]
    public function get(string $id): JsonResponse
    {
        try {
            return new JsonResponse($this->accounts->getAccount($id));
        } catch (AccountNotFoundException $e) {
            return JsonRequest::error($e, Response::HTTP_NOT_FOUND);
        }
    }

    #[Route('/api/accounts/{id}', name: 'api_accounts_update', methods: ['PATCH'])]
    public function update(string $id, Request $request): JsonResponse
    {
        $data = JsonRequest::body($request);
        $patch = [];
        if (isset($data['name'])) {
            $patch['name'] = JsonRequest::requireString($data, 'name');
        }
        if (\array_key_exists('notes', $data)) {
            $patch['notes'] = JsonRequest::optionalString($data, 'notes');
        }
        if (isset($data['position']) && \is_int($data['position'])) {
            $patch['position'] = $data['position'];
        }

        try {
            return new JsonResponse($this->accounts->updateAccount($id, $patch));
        } catch (AccountNotFoundException $e) {
            return JsonRequest::error($e, Response::HTTP_NOT_FOUND);
        }
    }

    #[Route('/api/accounts/{id}', name: 'api_accounts_delete', methods: ['DELETE'])]
    public function delete(string $id): JsonResponse
    {
        try {
            return new JsonResponse($this->accounts->archiveAccount($id));
        } catch (AccountNotFoundException $e) {
            return JsonRequest::error($e, Response::HTTP_NOT_FOUND);
        }
    }

    #[Route('/api/accounts/{accountId}/sub-accounts', name: 'api_sub_accounts_create', methods: ['POST'])]
    public function createSubAccount(string $accountId, Request $request): JsonResponse
    {
        $data = JsonRequest::body($request);

        try {
            $payload = $this->accounts->createSubAccount($accountId, [
                'name' => JsonRequest::requireString($data, 'name'),
                'icon' => JsonRequest::requireString($data, 'icon'),
                'color' => JsonRequest::requireString($data, 'color'),
                'openingBalanceCents' => isset($data['openingBalanceCents']) && \is_int($data['openingBalanceCents'])
                    ? $data['openingBalanceCents']
                    : 0,
                'position' => isset($data['position']) && \is_int($data['position']) ? $data['position'] : 0,
            ]);
        } catch (AccountNotFoundException $e) {
            return JsonRequest::error($e, Response::HTTP_NOT_FOUND);
        }

        return new JsonResponse($payload, Response::HTTP_CREATED);
    }

    #[Route('/api/sub-accounts/{id}', name: 'api_sub_accounts_get', methods: ['GET'])]
    public function getSubAccount(string $id): JsonResponse
    {
        try {
            return new JsonResponse($this->accounts->getSubAccount($id));
        } catch (SubAccountNotFoundException $e) {
            return JsonRequest::error($e, Response::HTTP_NOT_FOUND);
        }
    }

    #[Route('/api/sub-accounts/{id}', name: 'api_sub_accounts_update', methods: ['PATCH'])]
    public function updateSubAccount(string $id, Request $request): JsonResponse
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
        if (isset($data['openingBalanceCents']) && \is_int($data['openingBalanceCents'])) {
            $patch['openingBalanceCents'] = $data['openingBalanceCents'];
        }
        if (isset($data['position']) && \is_int($data['position'])) {
            $patch['position'] = $data['position'];
        }

        try {
            return new JsonResponse($this->accounts->updateSubAccount($id, $patch));
        } catch (SubAccountNotFoundException $e) {
            return JsonRequest::error($e, Response::HTTP_NOT_FOUND);
        }
    }

    #[Route('/api/sub-accounts/{id}', name: 'api_sub_accounts_delete', methods: ['DELETE'])]
    public function deleteSubAccount(string $id): JsonResponse
    {
        try {
            return new JsonResponse($this->accounts->archiveSubAccount($id));
        } catch (SubAccountNotFoundException $e) {
            return JsonRequest::error($e, Response::HTTP_NOT_FOUND);
        }
    }
}
