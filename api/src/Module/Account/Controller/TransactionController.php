<?php

declare(strict_types=1);

namespace App\Module\Account\Controller;

use App\Module\Account\Exception\InvalidTransactionException;
use App\Module\Account\Exception\SubAccountNotFoundException;
use App\Module\Account\Exception\TransactionNotFoundException;
use App\Module\Account\Service\TransactionManager;
use App\Module\Category\Exception\CategoryNotFoundException;
use App\Module\Merchant\Exception\MerchantNotFoundException;
use App\Shared\Http\JsonRequest;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class TransactionController extends AbstractController
{
    public function __construct(private readonly TransactionManager $transactions)
    {
    }

    #[Route('/api/sub-accounts/{subAccountId}/transactions', name: 'api_transactions_list', methods: ['GET'])]
    public function list(string $subAccountId, Request $request): JsonResponse
    {
        $categoryId = trim($request->query->getString('categoryId'));
        $yearMonth = trim($request->query->getString('yearMonth'));
        $hasCategory = '' !== $categoryId;
        $hasYearMonth = '' !== $yearMonth;

        if ($hasCategory xor $hasYearMonth) {
            return JsonRequest::error(
                new InvalidTransactionException('Les paramètres categoryId et yearMonth doivent être fournis ensemble.'),
                Response::HTTP_BAD_REQUEST,
            );
        }

        try {
            if ($hasCategory && $hasYearMonth) {
                return new JsonResponse($this->transactions->listForCategoryMonth($subAccountId, $categoryId, $yearMonth));
            }

            $limit = $request->query->getInt('limit', 50);
            $offset = $request->query->getInt('offset', 0);

            return new JsonResponse($this->transactions->listForSubAccount($subAccountId, $limit, $offset));
        } catch (SubAccountNotFoundException|CategoryNotFoundException $e) {
            return JsonRequest::error($e, Response::HTTP_NOT_FOUND);
        } catch (InvalidTransactionException $e) {
            return JsonRequest::error($e, Response::HTTP_BAD_REQUEST);
        }
    }

    #[Route('/api/sub-accounts/{subAccountId}/transactions', name: 'api_transactions_create', methods: ['POST'])]
    public function create(string $subAccountId, Request $request): JsonResponse
    {
        $data = JsonRequest::body($request);

        try {
            $payload = $this->transactions->create($subAccountId, [
                'categoryId'    => JsonRequest::requireString($data, 'categoryId'),
                'merchantId'    => JsonRequest::optionalString($data, 'merchantId'),
                'operationDate' => JsonRequest::requireString($data, 'operationDate'),
                'effectiveDate' => JsonRequest::optionalString($data, 'effectiveDate'),
                'paymentMethod' => JsonRequest::requireString($data, 'paymentMethod'),
                'checkNumber'   => JsonRequest::optionalString($data, 'checkNumber'),
                'designation'   => JsonRequest::requireString($data, 'designation'),
                'amountCents'   => JsonRequest::requireInt($data, 'amountCents'),
                'flow'          => JsonRequest::optionalString($data, 'flow'),
            ]);
        } catch (SubAccountNotFoundException|CategoryNotFoundException|MerchantNotFoundException $e) {
            return JsonRequest::error($e, Response::HTTP_NOT_FOUND);
        } catch (InvalidTransactionException|\ValueError|\Exception $e) {
            return JsonRequest::error($e, Response::HTTP_BAD_REQUEST);
        }

        return new JsonResponse($payload, Response::HTTP_CREATED);
    }

    #[Route('/api/transactions/{id}', name: 'api_transactions_update', methods: ['PATCH'])]
    public function update(string $id, Request $request): JsonResponse
    {
        $data = JsonRequest::body($request);
        $patch = [];
        if (isset($data['categoryId'])) {
            $patch['categoryId'] = JsonRequest::requireString($data, 'categoryId');
        }
        if (\array_key_exists('merchantId', $data)) {
            $patch['merchantId'] = JsonRequest::optionalString($data, 'merchantId');
        }
        if (isset($data['operationDate'])) {
            $patch['operationDate'] = JsonRequest::requireString($data, 'operationDate');
        }
        if (\array_key_exists('effectiveDate', $data)) {
            $patch['effectiveDate'] = JsonRequest::optionalString($data, 'effectiveDate');
        }
        if (isset($data['paymentMethod'])) {
            $patch['paymentMethod'] = JsonRequest::requireString($data, 'paymentMethod');
        }
        if (\array_key_exists('checkNumber', $data)) {
            $patch['checkNumber'] = JsonRequest::optionalString($data, 'checkNumber');
        }
        if (isset($data['designation'])) {
            $patch['designation'] = JsonRequest::requireString($data, 'designation');
        }
        if (isset($data['amountCents'])) {
            $patch['amountCents'] = JsonRequest::requireInt($data, 'amountCents');
        }
        if (\array_key_exists('flow', $data)) {
            $patch['flow'] = JsonRequest::optionalString($data, 'flow');
        }

        try {
            return new JsonResponse($this->transactions->update($id, $patch));
        } catch (TransactionNotFoundException|CategoryNotFoundException|MerchantNotFoundException $e) {
            return JsonRequest::error($e, Response::HTTP_NOT_FOUND);
        } catch (InvalidTransactionException|\ValueError|\Exception $e) {
            return JsonRequest::error($e, Response::HTTP_BAD_REQUEST);
        }
    }

    #[Route('/api/transactions/{id}', name: 'api_transactions_delete', methods: ['DELETE'])]
    public function delete(string $id): JsonResponse
    {
        try {
            $this->transactions->delete($id);
        } catch (TransactionNotFoundException $e) {
            return JsonRequest::error($e, Response::HTTP_NOT_FOUND);
        }

        return new JsonResponse(null, Response::HTTP_NO_CONTENT);
    }

    #[Route('/api/transactions/{id}/attachment', name: 'api_transactions_upload_attachment', methods: ['POST'])]
    public function uploadAttachment(string $id, Request $request): JsonResponse
    {
        $file = $request->files->get('file');
        if (!$file instanceof UploadedFile) {
            return JsonRequest::error(new \InvalidArgumentException('Le champ "file" est requis.'), Response::HTTP_BAD_REQUEST);
        }

        try {
            return new JsonResponse($this->transactions->uploadAttachment($id, $file));
        } catch (TransactionNotFoundException $e) {
            return JsonRequest::error($e, Response::HTTP_NOT_FOUND);
        } catch (\InvalidArgumentException $e) {
            return JsonRequest::error($e, Response::HTTP_BAD_REQUEST);
        }
    }

    #[Route('/api/transactions/{id}/attachment', name: 'api_transactions_get_attachment', methods: ['GET'])]
    public function getAttachment(string $id): Response
    {
        try {
            return $this->transactions->streamAttachment($id);
        } catch (TransactionNotFoundException $e) {
            return JsonRequest::error($e, Response::HTTP_NOT_FOUND);
        }
    }

    #[Route('/api/transactions/{id}/attachment', name: 'api_transactions_delete_attachment', methods: ['DELETE'])]
    public function deleteAttachment(string $id): JsonResponse
    {
        try {
            return new JsonResponse($this->transactions->clearAttachment($id));
        } catch (TransactionNotFoundException $e) {
            return JsonRequest::error($e, Response::HTTP_NOT_FOUND);
        }
    }
}
