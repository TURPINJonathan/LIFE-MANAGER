<?php

declare(strict_types=1);

namespace App\Module\Account\Controller;

use App\Module\Account\Exception\ForecastNotFoundException;
use App\Module\Account\Exception\InvalidForecastException;
use App\Module\Account\Exception\InvalidTransactionException;
use App\Module\Account\Exception\SubAccountNotFoundException;
use App\Module\Account\Service\ForecastManager;
use App\Module\Category\Exception\CategoryNotFoundException;
use App\Shared\Http\JsonRequest;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class ForecastController extends AbstractController
{
    public function __construct(private readonly ForecastManager $forecasts)
    {
    }

    #[Route('/api/sub-accounts/{subAccountId}/forecasts', name: 'api_forecasts_get', methods: ['GET'])]
    public function get(string $subAccountId, Request $request): JsonResponse
    {
        $yearMonth = $request->query->getString('yearMonth');
        if ('' === $yearMonth) {
            return JsonRequest::error(new InvalidForecastException('Le paramètre yearMonth est requis.'), Response::HTTP_BAD_REQUEST);
        }

        try {
            $payload = $this->forecasts->getForMonth($subAccountId, $yearMonth);
        } catch (SubAccountNotFoundException $e) {
            return JsonRequest::error($e, Response::HTTP_NOT_FOUND);
        } catch (\InvalidArgumentException $e) {
            return JsonRequest::error($e, Response::HTTP_BAD_REQUEST);
        }

        return JsonResponse::fromJsonString(
            json_encode($payload, \JSON_THROW_ON_ERROR),
            Response::HTTP_OK,
        );
    }

    #[Route('/api/sub-accounts/{subAccountId}/forecasts', name: 'api_forecasts_create', methods: ['POST'])]
    public function create(string $subAccountId, Request $request): JsonResponse
    {
        $data = JsonRequest::body($request);

        try {
            $lines = $data['lines'] ?? [];
            if (!\is_array($lines)) {
                throw new InvalidForecastException('Le champ "lines" doit être un tableau.');
            }
            $payload = $this->forecasts->create($subAccountId, [
                'yearMonth' => JsonRequest::requireString($data, 'yearMonth'),
                'lines'     => $lines,
            ]);
        } catch (SubAccountNotFoundException|CategoryNotFoundException $e) {
            return JsonRequest::error($e, Response::HTTP_NOT_FOUND);
        } catch (InvalidForecastException|InvalidTransactionException|\InvalidArgumentException|\ValueError $e) {
            return JsonRequest::error($e, Response::HTTP_BAD_REQUEST);
        }

        return new JsonResponse($payload, Response::HTTP_CREATED);
    }

    #[Route('/api/sub-accounts/{subAccountId}/forecasts/duplicate', name: 'api_forecasts_duplicate', methods: ['POST'])]
    public function duplicate(string $subAccountId, Request $request): JsonResponse
    {
        $data = JsonRequest::body($request);
        $payloadData = [];
        $source = JsonRequest::optionalString($data, 'sourceYearMonth');
        $target = JsonRequest::optionalString($data, 'targetYearMonth');
        if (null !== $source) {
            $payloadData['sourceYearMonth'] = $source;
        }
        if (null !== $target) {
            $payloadData['targetYearMonth'] = $target;
        }

        try {
            $payload = $this->forecasts->duplicate($subAccountId, $payloadData);
        } catch (SubAccountNotFoundException|ForecastNotFoundException $e) {
            return JsonRequest::error($e, Response::HTTP_NOT_FOUND);
        } catch (InvalidForecastException|\InvalidArgumentException $e) {
            return JsonRequest::error($e, Response::HTTP_BAD_REQUEST);
        }

        return new JsonResponse($payload, Response::HTTP_CREATED);
    }

    #[Route('/api/forecasts/{id}', name: 'api_forecasts_update', methods: ['PATCH'])]
    public function update(string $id, Request $request): JsonResponse
    {
        $data = JsonRequest::body($request);

        try {
            $lines = $data['lines'] ?? null;
            if (!\is_array($lines)) {
                throw new InvalidForecastException('Le champ "lines" est requis.');
            }
            $payload = $this->forecasts->update($id, ['lines' => $lines]);
        } catch (ForecastNotFoundException|CategoryNotFoundException $e) {
            return JsonRequest::error($e, Response::HTTP_NOT_FOUND);
        } catch (InvalidForecastException|InvalidTransactionException|\InvalidArgumentException|\ValueError $e) {
            return JsonRequest::error($e, Response::HTTP_BAD_REQUEST);
        }

        return new JsonResponse($payload);
    }

    #[Route('/api/forecasts/{id}', name: 'api_forecasts_delete', methods: ['DELETE'])]
    public function delete(string $id): JsonResponse
    {
        try {
            $this->forecasts->delete($id);
        } catch (ForecastNotFoundException $e) {
            return JsonRequest::error($e, Response::HTTP_NOT_FOUND);
        }

        return new JsonResponse(null, Response::HTTP_NO_CONTENT);
    }

    #[Route('/api/sub-accounts/{subAccountId}/forecast-stats', name: 'api_forecast_stats', methods: ['GET'])]
    public function stats(string $subAccountId, Request $request): JsonResponse
    {
        $yearMonth = $request->query->getString('yearMonth');
        if ('' === $yearMonth) {
            return JsonRequest::error(new InvalidForecastException('Le paramètre yearMonth est requis.'), Response::HTTP_BAD_REQUEST);
        }

        try {
            return new JsonResponse($this->forecasts->stats($subAccountId, $yearMonth));
        } catch (SubAccountNotFoundException $e) {
            return JsonRequest::error($e, Response::HTTP_NOT_FOUND);
        } catch (\InvalidArgumentException $e) {
            return JsonRequest::error($e, Response::HTTP_BAD_REQUEST);
        }
    }

    #[Route('/api/forecast-stats/dashboard', name: 'api_forecast_stats_dashboard', methods: ['GET'])]
    public function statsDashboard(Request $request): JsonResponse
    {
        $yearMonth = $request->query->getString('yearMonth');
        if ('' === $yearMonth) {
            return JsonRequest::error(new InvalidForecastException('Le paramètre yearMonth est requis.'), Response::HTTP_BAD_REQUEST);
        }

        $includePrevious = $request->query->getBoolean('includePrevious', true);

        try {
            return new JsonResponse($this->forecasts->statsDashboard($yearMonth, $includePrevious));
        } catch (\InvalidArgumentException $e) {
            return JsonRequest::error($e, Response::HTTP_BAD_REQUEST);
        }
    }
}
