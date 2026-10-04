<?php

declare(strict_types=1);

namespace App\Module\Work\Service;

use App\Module\Work\Exception\InvalidWorkException;

final class WorkScheduleSupport
{
    /**
     * @param list<mixed> $raw
     *
     * @return list<array{start: string, end: string}>
     */
    public function normalizeSegments(array $raw): array
    {
        if ([] === $raw) {
            throw new InvalidWorkException('Au moins un créneau est requis.');
        }

        $segments = [];
        foreach ($raw as $item) {
            if (!\is_array($item) || !isset($item['start'], $item['end']) || !\is_string($item['start']) || !\is_string($item['end'])) {
                throw new InvalidWorkException('Chaque créneau doit avoir start et end (HH:MM).');
            }
            $start = $this->parseTime($item['start'], 'start');
            $end = $this->parseTime($item['end'], 'end');
            $startMin = ((int) $start->format('H')) * 60 + (int) $start->format('i');
            $endMin = ((int) $end->format('H')) * 60 + (int) $end->format('i');
            if (0 === $endMin && $startMin > 0) {
                $endMin = 24 * 60;
            }
            if ($endMin <= $startMin) {
                throw new InvalidWorkException('La fin d’un créneau doit être après le début (pas de nuitée).');
            }
            $segments[] = [
                'start'     => $start->format('H:i'),
                'end'       => $end->format('H:i'),
                '_startMin' => $startMin,
                '_endMin'   => $endMin,
            ];
        }

        usort($segments, static fn (array $a, array $b): int => $a['_startMin'] <=> $b['_startMin']);

        $prevEnd = -1;
        $normalized = [];
        foreach ($segments as $seg) {
            if ($seg['_startMin'] < $prevEnd) {
                throw new InvalidWorkException('Les créneaux ne doivent pas se chevaucher.');
            }
            $prevEnd = $seg['_endMin'];
            $normalized[] = ['start' => $seg['start'], 'end' => $seg['end']];
        }

        return $normalized;
    }

    public function parseDate(mixed $value, string $field): \DateTimeImmutable
    {
        if (!\is_string($value) || '' === trim($value)) {
            throw new InvalidWorkException(\sprintf('Le champ "%s" est requis (YYYY-MM-DD).', $field));
        }
        $date = \DateTimeImmutable::createFromFormat('Y-m-d', trim($value));
        if (false === $date) {
            throw new InvalidWorkException(\sprintf('Le champ "%s" doit être une date YYYY-MM-DD.', $field));
        }

        return $date->setTime(0, 0);
    }

    public function parseTime(string $value, string $field): \DateTimeImmutable
    {
        $value = trim($value);
        if (1 !== preg_match('/^\d{2}:\d{2}$/', $value)) {
            throw new InvalidWorkException(\sprintf('Le champ "%s" doit être au format HH:MM.', $field));
        }
        $time = \DateTimeImmutable::createFromFormat('H:i', $value);
        if (false === $time) {
            throw new InvalidWorkException(\sprintf('Heure invalide pour "%s".', $field));
        }

        return $time;
    }

    /**
     * @return list<array{enabled: bool, segments: list<array{start: string, end: string}>, pauseMinutes: int}>
     */
    public function normalizeWeekTemplate(mixed $raw): array
    {
        if (!\is_array($raw) || 7 !== \count($raw)) {
            throw new InvalidWorkException('La semaine type doit contenir exactement 7 jours (lundi → dimanche).');
        }

        $days = [];
        foreach (array_values($raw) as $index => $item) {
            if (!\is_array($item)) {
                throw new InvalidWorkException(\sprintf('Jour %d de la semaine type invalide.', $index + 1));
            }
            $enabled = (bool) ($item['enabled'] ?? false);
            $pause = isset($item['pauseMinutes']) && \is_int($item['pauseMinutes'])
                ? max(0, $item['pauseMinutes'])
                : 0;
            if (!$enabled) {
                $days[] = ['enabled' => false, 'segments' => [], 'pauseMinutes' => 0];
                continue;
            }
            if (!isset($item['segments']) || !\is_array($item['segments'])) {
                throw new InvalidWorkException(\sprintf('Créneaux requis pour le jour %d.', $index + 1));
            }
            /** @var list<mixed> $segRaw */
            $segRaw = array_values($item['segments']);
            $days[] = [
                'enabled'      => true,
                'segments'     => $this->normalizeSegments($segRaw),
                'pauseMinutes' => $pause,
            ];
        }

        return $days;
    }

    /**
     * Bit 0 = lundi … bit 6 = dimanche.
     *
     * @param list<array{enabled: bool, segments: list<array{start: string, end: string}>, pauseMinutes: int}> $template
     */
    public function maskFromWeekTemplate(array $template): int
    {
        $mask = 0;
        foreach ($template as $bit => $day) {
            if ($day['enabled']) {
                $mask |= 1 << $bit;
            }
        }

        return $mask;
    }
}
