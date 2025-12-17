<template>
  <div class="flex flex-col h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 overflow-hidden font-sans selection:bg-yellow-500/20 selection:text-yellow-600">
    <!-- TODO: Add CommandPalette -->
    <AppHeader />

    <main class="flex-1 overflow-y-auto min-w-0 bg-white dark:bg-gray-950 relative scroll-smooth">
      <div class="container mx-auto p-4 md:p-8 max-w-[1600px]">
        <slot />
      </div>
    </main>
  </div>
</template>
