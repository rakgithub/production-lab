"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Input } from "@repo/ui/components/input";

type User = {
  id: string;
  name: string;
  email: string;
};

export default function AddUsers() {
  const [users, setUsers] = useState<User[]>([]);

  function addUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();

    if (!name || !email) {
      return;
    }

    setUsers((currentUsers) => [
      ...currentUsers,
      { id: crypto.randomUUID(), name, email },
    ]);
    form.reset();
  }

  return (
    <main className="mx-auto w-full max-w-3xl space-y-8 px-6 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Users</h1>
        <p className="text-muted-foreground">
          Add people who can access your workspace.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Add user</CardTitle>
          <CardDescription>
            Enter the user&apos;s basic account information.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={addUser}>
            <label className="space-y-2">
              <span className="text-sm font-medium">Name</span>
              <Input
                autoComplete="name"
                name="name"
                placeholder="Alex Morgan"
                required
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium">Email</span>
              <Input
                autoComplete="email"
                name="email"
                placeholder="alex@example.com"
                required
                type="email"
              />
            </label>

            <Button className="sm:col-span-2 sm:w-fit" type="submit">
              Add user
            </Button>
          </form>
        </CardContent>
      </Card>

      <section aria-labelledby="users-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold" id="users-heading">
            Added users
          </h2>
          <span className="text-sm text-muted-foreground">
            {users.length} {users.length === 1 ? "user" : "users"}
          </span>
        </div>

        <div aria-live="polite">
          {users.length === 0 ? (
            <Card size="sm">
              <CardContent className="text-muted-foreground">
                No users have been added yet.
              </CardContent>
            </Card>
          ) : (
            <ul className="space-y-3">
              {users.map((user) => (
                <li key={user.id}>
                  <Card size="sm">
                    <CardContent>
                      <p className="font-semibold">{user.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {user.email}
                      </p>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
