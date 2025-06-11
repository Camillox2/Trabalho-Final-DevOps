<?php

class User {
    public ?int $id;
    public string $username;
    public string $password;

    public function __construct(string $username, string $password, ?int $id = null) {
        $this->id = $id;
        $this->username = $username;
        $this->password = $password;
    }
}
