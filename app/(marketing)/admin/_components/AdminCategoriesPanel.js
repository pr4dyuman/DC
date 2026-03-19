"use client";

export function AdminCategoriesPanel({
  newCategory,
  setNewCategory,
  categoryStatus,
  categories,
  handleCreateCategory,
  openDeleteModal,
}) {
  return (
    <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
      <h3 className="text-lg font-etna text-zinc-100 mb-4">Categories</h3>
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          placeholder="New category..."
          className="flex-1 bg-black border border-zinc-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-white"
        />
        <button
          onClick={handleCreateCategory}
          disabled={!newCategory}
          className="bg-zinc-700 hover:bg-white hover:text-black text-white px-4 py-2 rounded text-sm font-bold transition-all disabled:opacity-50"
        >
          ADD
        </button>
      </div>
      {categoryStatus && <p className="text-xs text-gray-400 mb-2">{categoryStatus}</p>}

      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <span key={category._id} className="bg-black border border-zinc-700 px-3 py-1 rounded-full text-xs flex items-center gap-2 group">
            {category.name}
            <button
              onClick={() => openDeleteModal(category)}
              className="text-zinc-500 hover:text-red-500 text-lg leading-none"
            >
              X
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
