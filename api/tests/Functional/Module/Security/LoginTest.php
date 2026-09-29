<?php

declare(strict_types=1);

namespace App\Tests\Functional\Module\Security;

use App\Module\Security\Contract\Service\IUserProvisioner;
use App\Module\Security\Domain\Enum\UserRole;
use App\Tests\ResetsSchemaTrait;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

final class LoginTest extends WebTestCase
{
    use ResetsSchemaTrait;

    private KernelBrowser $client;

    protected function setUp(): void
    {
        $this->client = static::createClient();
        $manager = static::getContainer()->get(EntityManagerInterface::class);
        $this->resetDatabaseSchema($manager);
    }

    public function testLoginReturnsJwtAndMeRequiresIt(): void
    {
        $provisioner = static::getContainer()->get(IUserProvisioner::class);
        $provisioner->create('turpin.j@hotmail.fr', 'Secret123456', 'Ada', 'Lovelace', [UserRole::User]);

        $this->client->request(
            'GET',
            '/api/me',
            server: ['HTTP_ACCEPT' => 'application/json'],
        );
        self::assertResponseStatusCodeSame(401);

        $this->client->request(
            'POST',
            '/api/login',
            server: ['CONTENT_TYPE' => 'application/json', 'HTTP_ACCEPT' => 'application/json'],
            content: json_encode(['email' => 'turpin.j@hotmail.fr', 'password' => 'Secret123456'], \JSON_THROW_ON_ERROR),
        );
        self::assertResponseIsSuccessful();
        $payload = json_decode($this->client->getResponse()->getContent() ?: '', true, 512, \JSON_THROW_ON_ERROR);
        self::assertIsArray($payload);
        self::assertArrayHasKey('token', $payload);
        self::assertIsString($payload['token']);

        $this->client->request(
            'GET',
            '/api/me',
            server: [
                'HTTP_ACCEPT'        => 'application/json',
                'HTTP_AUTHORIZATION' => 'Bearer '.$payload['token'],
            ],
        );
        self::assertResponseIsSuccessful();
        $me = json_decode($this->client->getResponse()->getContent() ?: '', true, 512, \JSON_THROW_ON_ERROR);
        self::assertSame('turpin.j@hotmail.fr', $me['email']);
        self::assertContains('ROLE_USER', $me['roles']);
    }

    public function testLoginRejectsAWrongPassword(): void
    {
        $provisioner = static::getContainer()->get(IUserProvisioner::class);
        $provisioner->create('turpin.j@hotmail.fr', 'Secret123456', 'Ada', 'Lovelace', [UserRole::User]);

        $this->client->request(
            'POST',
            '/api/login',
            server: ['CONTENT_TYPE' => 'application/json'],
            content: json_encode(['email' => 'turpin.j@hotmail.fr', 'password' => 'Wrong123456'], \JSON_THROW_ON_ERROR),
        );

        self::assertResponseStatusCodeSame(401);
    }
}
