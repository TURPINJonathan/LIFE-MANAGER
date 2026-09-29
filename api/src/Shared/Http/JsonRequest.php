<?php

declare(strict_types=1);

namespace App\Shared\Http;

use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;

final class JsonRequest
{
    /**
     * @return array<string, mixed>
     */
    public static function body(Request $request): array
    {
        $raw = $request->getContent();
        if ('' === $raw) {
            return [];
        }

        try {
            $data = json_decode($raw, true, 512, \JSON_THROW_ON_ERROR);
        } catch (\JsonException $e) {
            throw new BadRequestHttpException('JSON invalide.', $e);
        }

        if (!\is_array($data)) {
            throw new BadRequestHttpException('Le corps doit être un objet JSON.');
        }

        /** @var array<string, mixed> $data */
        return $data;
    }

    /**
     * @param array<string, mixed> $data
     */
    public static function requireString(array $data, string $key): string
    {
        if (!isset($data[$key]) || !\is_string($data[$key]) || '' === trim($data[$key])) {
            throw new BadRequestHttpException(sprintf('Le champ "%s" est requis.', $key));
        }

        return trim($data[$key]);
    }

    /**
     * @param array<string, mixed> $data
     */
    public static function optionalString(array $data, string $key): ?string
    {
        if (!\array_key_exists($key, $data) || null === $data[$key]) {
            return null;
        }
        if (!\is_string($data[$key])) {
            throw new BadRequestHttpException(sprintf('Le champ "%s" doit être une chaîne.', $key));
        }

        $value = trim($data[$key]);

        return '' === $value ? null : $value;
    }

    /**
     * @param array<string, mixed> $data
     */
    public static function requireInt(array $data, string $key): int
    {
        if (!isset($data[$key]) || !\is_int($data[$key])) {
            throw new BadRequestHttpException(sprintf('Le champ "%s" doit être un entier.', $key));
        }

        return $data[$key];
    }

    /**
     * @param array<string, mixed> $data
     *
     * @return list<string>
     */
    public static function requireStringList(array $data, string $key): array
    {
        if (!isset($data[$key]) || !\is_array($data[$key])) {
            throw new BadRequestHttpException(sprintf('Le champ "%s" doit être un tableau de chaînes.', $key));
        }

        $values = [];
        foreach ($data[$key] as $item) {
            if (!\is_string($item) || '' === trim($item)) {
                throw new BadRequestHttpException(sprintf('Le champ "%s" doit contenir uniquement des chaînes non vides.', $key));
            }
            $values[] = trim($item);
        }

        return $values;
    }

    public static function error(\Throwable $e, int $status = 400): JsonResponse
    {
        return new JsonResponse(['message' => $e->getMessage()], $status);
    }
}
