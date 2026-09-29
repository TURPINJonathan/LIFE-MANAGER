<?php

declare(strict_types=1);

namespace App\Shared\Upload;

use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\HeaderUtils;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;
use Symfony\Component\Uid\Uuid;

/**
 * Stockage disque des uploads : contenu gzippé à l’écriture, décompressé à la lecture.
 * Les chemins relatifs se terminent par `.{ext}.gz` ; les fichiers legacy non compressés restent lisibles.
 */
final class LocalUploadStorage
{
    private const MAX_BYTES = 10 * 1024 * 1024;
    private const GZIP_LEVEL = 9;

    private const IMAGE_MIMES = [
        'image/jpeg',
        'image/png',
        'image/webp',
    ];

    private const ATTACHMENT_MIMES = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'image/bmp',
        'image/heic',
        'image/heif',
        'application/pdf',
    ];

    public function __construct(
        #[Autowire('%kernel.project_dir%/var/uploads')]
        private readonly string $baseDir,
    ) {
    }

    public function store(UploadedFile $file, string $subdir): string
    {
        $this->assertMaxSize($file);
        $ext = $this->extensionFor($file);
        $relative = trim($subdir, '/').'/'.Uuid::v7()->toRfc4122().'.'.$ext.'.gz';
        $absolute = $this->absolutePath($relative);
        $dir = \dirname($absolute);
        if (!is_dir($dir) && !mkdir($dir, 0775, true) && !is_dir($dir)) {
            throw new \RuntimeException('Impossible de créer le dossier d’upload.');
        }

        $raw = file_get_contents($file->getPathname());
        if (false === $raw) {
            throw new \RuntimeException('Lecture du fichier uploadé impossible.');
        }

        $compressed = gzencode($raw, self::GZIP_LEVEL);
        if (false === $compressed) {
            throw new \RuntimeException('Compression du fichier impossible.');
        }

        if (false === file_put_contents($absolute, $compressed)) {
            throw new \RuntimeException('Écriture du fichier compressé impossible.');
        }

        return $relative;
    }

    public function absolutePath(string $relativePath): string
    {
        $relativePath = str_replace('\\', '/', $relativePath);
        if (str_contains($relativePath, '..')) {
            throw new \InvalidArgumentException('Chemin de fichier invalide.');
        }

        return rtrim($this->baseDir, '/\\').'/'.ltrim($relativePath, '/');
    }

    public function delete(?string $relativePath): void
    {
        if (null === $relativePath || '' === $relativePath) {
            return;
        }
        $absolute = $this->absolutePath($relativePath);
        if (is_file($absolute)) {
            unlink($absolute);
        }
    }

    /**
     * Sert le fichier décompressé (ou tel quel s’il n’est pas en .gz).
     */
    public function createFileResponse(
        string $relativePath,
        ?string $contentType = null,
        ?string $filename = null,
        string $disposition = ResponseHeaderBag::DISPOSITION_INLINE,
    ): Response {
        $absolute = $this->absolutePath($relativePath);
        if (!is_file($absolute)) {
            throw new \InvalidArgumentException('Fichier introuvable.');
        }

        $onDisk = file_get_contents($absolute);
        if (false === $onDisk) {
            throw new \RuntimeException('Lecture du fichier impossible.');
        }

        $payload = $this->isGzipPath($relativePath) ? gzdecode($onDisk) : $onDisk;
        if (false === $payload) {
            throw new \RuntimeException('Décompression du fichier impossible.');
        }

        $mime = $contentType ?? $this->mimeFromRelativePath($relativePath);
        $response = new Response($payload);
        $response->headers->set('Content-Type', $mime);
        $response->headers->set('Content-Length', (string) \strlen($payload));

        if (null !== $filename && '' !== $filename) {
            $response->headers->set(
                'Content-Disposition',
                HeaderUtils::makeDisposition($disposition, $filename),
            );
        } else {
            $response->headers->set('Content-Disposition', $disposition);
        }

        return $response;
    }

    public function mimeFromRelativePath(string $relativePath): string
    {
        $logical = $this->isGzipPath($relativePath)
            ? substr($relativePath, 0, -3)
            : $relativePath;
        $ext = strtolower(pathinfo($logical, PATHINFO_EXTENSION));

        return match ($ext) {
            'jpg', 'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'webp' => 'image/webp',
            'gif' => 'image/gif',
            'bmp' => 'image/bmp',
            'heic' => 'image/heic',
            'heif' => 'image/heif',
            'pdf' => 'application/pdf',
            default => 'application/octet-stream',
        };
    }

    public function assertImageMime(UploadedFile $file): void
    {
        $this->assertMaxSize($file);
        $this->assertMime($file, self::IMAGE_MIMES, 'image (JPEG, PNG ou WebP)');
    }

    public function assertAttachmentMime(UploadedFile $file): void
    {
        $this->assertMaxSize($file);
        $this->assertMime($file, self::ATTACHMENT_MIMES, 'fichier (image ou PDF)');
    }

    private function isGzipPath(string $relativePath): bool
    {
        return str_ends_with(strtolower($relativePath), '.gz');
    }

    private function assertMaxSize(UploadedFile $file): void
    {
        if ($file->getSize() > self::MAX_BYTES) {
            throw new \InvalidArgumentException('Le fichier ne doit pas dépasser 10 Mo.');
        }
    }

    /**
     * @param list<string> $allowed
     */
    private function assertMime(UploadedFile $file, array $allowed, string $label): void
    {
        $mime = $this->detectMime($file);
        if (!\in_array($mime, $allowed, true)) {
            throw new \InvalidArgumentException(sprintf('Type de fichier non autorisé. Attendu : %s.', $label));
        }
    }

    private function detectMime(UploadedFile $file): string
    {
        $path = $file->getPathname();
        if (is_file($path)) {
            $finfo = new \finfo(\FILEINFO_MIME_TYPE);
            $detected = $finfo->file($path);
            if (\is_string($detected) && '' !== $detected && 'application/octet-stream' !== $detected) {
                return $detected;
            }
        }

        $client = $file->getClientMimeType();

        return \is_string($client) ? $client : '';
    }

    private function extensionFor(UploadedFile $file): string
    {
        return match ($this->detectMime($file)) {
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
            'image/gif' => 'gif',
            'image/bmp' => 'bmp',
            'image/heic' => 'heic',
            'image/heif' => 'heif',
            'application/pdf' => 'pdf',
            default => pathinfo($file->getClientOriginalName(), PATHINFO_EXTENSION) ?: 'bin',
        };
    }
}
