<?php

declare(strict_types=1);

namespace App\Module\Work\Service;

use App\Module\Security\Contract\Service\ICurrentUserAccessor;
use App\Module\Work\Domain\Entity\WorkDocument;
use App\Module\Work\Domain\Enum\WorkDocumentKind;
use App\Module\Work\Exception\InvalidWorkException;
use App\Module\Work\Exception\WorkDocumentNotFoundException;
use App\Module\Work\Repository\WorkDocumentRepository;
use App\Shared\Upload\LocalUploadStorage;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;
use Symfony\Component\Uid\Uuid;

final class WorkDocumentManager
{
    public function __construct(
        private readonly WorkDocumentRepository $documents,
        private readonly JobManager $jobs,
        private readonly LocalUploadStorage $uploads,
        private readonly ICurrentUserAccessor $users,
    ) {
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function listForJob(string $jobId): array
    {
        $job = $this->jobs->requireJob($jobId);
        $result = [];
        foreach ($this->documents->listForJob($job) as $doc) {
            $result[] = $this->serialize($doc);
        }

        return $result;
    }

    /**
     * @param array{kind: string, label: string, yearMonth?: ?string} $data
     *
     * @return array<string, mixed>
     */
    public function create(string $jobId, array $data): array
    {
        $job = $this->jobs->requireJob($jobId);
        $kind = WorkDocumentKind::tryFrom($data['kind']);
        if (null === $kind) {
            throw new InvalidWorkException('Type de document invalide.');
        }
        $yearMonth = $data['yearMonth'] ?? null;
        if (WorkDocumentKind::Payslip === $kind) {
            if (!\is_string($yearMonth) || 1 !== preg_match('/^\d{4}-\d{2}$/', $yearMonth)) {
                throw new InvalidWorkException('yearMonth (YYYY-MM) est requis pour une fiche de paie.');
            }
        } elseif (null !== $yearMonth && '' !== $yearMonth && 1 !== preg_match('/^\d{4}-\d{2}$/', (string) $yearMonth)) {
            throw new InvalidWorkException('yearMonth doit être au format YYYY-MM.');
        }

        $doc = new WorkDocument($job, $kind, $data['label'], \is_string($yearMonth) ? $yearMonth : null);
        $this->documents->save($doc);

        return $this->serialize($doc);
    }

    /**
     * @param array{kind?: string, label?: string, yearMonth?: ?string} $data
     *
     * @return array<string, mixed>
     */
    public function update(string $id, array $data): array
    {
        $doc = $this->requireOwned($id);
        if (isset($data['kind'])) {
            $kind = WorkDocumentKind::tryFrom((string) $data['kind']);
            if (null === $kind) {
                throw new InvalidWorkException('Type de document invalide.');
            }
            $doc->setKind($kind);
        }
        if (isset($data['label'])) {
            $doc->setLabel((string) $data['label']);
        }
        if (\array_key_exists('yearMonth', $data)) {
            $ym = $data['yearMonth'];
            if (null !== $ym && '' !== $ym && 1 !== preg_match('/^\d{4}-\d{2}$/', (string) $ym)) {
                throw new InvalidWorkException('yearMonth doit être au format YYYY-MM.');
            }
            $doc->setYearMonth(null === $ym || '' === $ym ? null : (string) $ym);
        }
        if (WorkDocumentKind::Payslip === $doc->getKind() && null === $doc->getYearMonth()) {
            throw new InvalidWorkException('yearMonth (YYYY-MM) est requis pour une fiche de paie.');
        }
        $this->documents->save($doc);

        return $this->serialize($doc);
    }

    public function delete(string $id): void
    {
        $doc = $this->requireOwned($id);
        if ($doc->hasFile()) {
            $this->uploads->delete($doc->getPath());
        }
        $this->documents->remove($doc);
    }

    /**
     * @return array<string, mixed>
     */
    public function uploadFile(string $id, UploadedFile $file): array
    {
        $doc = $this->requireOwned($id);
        $this->uploads->assertAttachmentMime($file);
        $ownerId = (string) $this->users->requireUser()->getId();
        $relative = $this->uploads->store($file, 'work-documents/'.$ownerId);
        if ($doc->hasFile()) {
            $this->uploads->delete($doc->getPath());
        }
        $doc->setFile(
            $relative,
            $file->getMimeType(),
            $file->getClientOriginalName(),
            $file->getSize() ?: null,
        );
        $this->documents->save($doc);

        return $this->serialize($doc);
    }

    public function streamFile(string $id): Response
    {
        $doc = $this->requireOwned($id);
        if (!$doc->hasFile()) {
            throw new WorkDocumentNotFoundException('Fichier introuvable.');
        }
        $relative = (string) $doc->getPath();
        $filename = $doc->getOriginalName() ?: basename($relative, '.gz');

        try {
            return $this->uploads->createFileResponse(
                $relative,
                $doc->getMime(),
                $filename,
                ResponseHeaderBag::DISPOSITION_INLINE,
            );
        } catch (\InvalidArgumentException) {
            throw new WorkDocumentNotFoundException('Fichier introuvable.');
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function deleteFile(string $id): array
    {
        $doc = $this->requireOwned($id);
        if ($doc->hasFile()) {
            $this->uploads->delete($doc->getPath());
            $doc->setFile(null, null, null, null);
            $this->documents->save($doc);
        }

        return $this->serialize($doc);
    }

    private function requireOwned(string $id): WorkDocument
    {
        try {
            $uuid = Uuid::fromString($id);
        } catch (\InvalidArgumentException) {
            throw new WorkDocumentNotFoundException();
        }

        $doc = $this->documents->findOwned($uuid, $this->users->requireUser());
        if (null === $doc) {
            throw new WorkDocumentNotFoundException();
        }

        return $doc;
    }

    /**
     * @return array<string, mixed>
     */
    private function serialize(WorkDocument $doc): array
    {
        $id = (string) $doc->getId();

        return [
            'id'           => $id,
            'jobId'        => (string) $doc->getJob()->getId(),
            'kind'         => $doc->getKind()->value,
            'label'        => $doc->getLabel(),
            'yearMonth'    => $doc->getYearMonth(),
            'hasFile'      => $doc->hasFile(),
            'fileUrl'      => $doc->hasFile() ? '/api/work-documents/'.$id.'/file' : null,
            'originalName' => $doc->getOriginalName(),
            'mime'         => $doc->getMime(),
            'size'         => $doc->getSize(),
            'createdAt'    => $doc->getCreatedAt()->format(\DateTimeInterface::ATOM),
        ];
    }
}
