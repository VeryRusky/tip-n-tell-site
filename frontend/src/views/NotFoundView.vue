<template>
  <main id="main" class="container-lg pt-3 measure">
    <h1 class="mt-3">Page not found</h1>
    <p>This page doesn't exist. It may have moved.</p>
    <RouterLink :to="{ name: 'home' }" class="btn btn-primary btn-lg w-100"
      >Go to the home page</RouterLink
    >
  </main>
</template>
