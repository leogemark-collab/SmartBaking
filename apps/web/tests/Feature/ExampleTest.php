<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ExampleTest extends TestCase
{
    use RefreshDatabase;

    public function test_homepage_is_public_and_renders_the_welcome_page()
    {
        $response = $this->get(route('home'));

        $response->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('welcome')
                ->where('auth.user', null)
            );
    }
}
