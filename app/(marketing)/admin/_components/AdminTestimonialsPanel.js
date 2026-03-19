"use client";

export function AdminTestimonialsPanel({
  testimonials,
  showTestimonialForm,
  editingTestimonial,
  testimonialForm,
  handleCreateTestimonial,
  handleTestimonialFormChange,
  handleSaveTestimonial,
  setShowTestimonialForm,
  handleEditTestimonial,
  openTestimonialDeleteModal,
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-etna text-zinc-100 flex items-center gap-4">
          <span>Manage Testimonials</span>
          <span className="text-sm font-sans font-normal text-gray-500 bg-zinc-900 px-3 py-1 rounded-full">
            {testimonials.length} items
          </span>
        </h2>
        <button
          onClick={handleCreateTestimonial}
          className="bg-white text-black font-etna px-6 py-3 rounded-lg hover:bg-gray-200 transition-all shadow-lg hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]"
        >
          + ADD TESTIMONIAL
        </button>
      </div>

      {showTestimonialForm && (
        <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 mb-6">
          <h3 className="text-lg font-etna text-zinc-100 mb-4">
            {editingTestimonial ? "Edit Testimonial" : "New Testimonial"}
          </h3>
          <form onSubmit={handleSaveTestimonial} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Client Name</label>
              <input
                type="text"
                value={testimonialForm.name}
                onChange={(e) => handleTestimonialFormChange("name", e.target.value)}
                className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-white"
                placeholder="e.g., RAJESH KUMAR, CEO"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Company</label>
              <input
                type="text"
                value={testimonialForm.company}
                onChange={(e) => handleTestimonialFormChange("company", e.target.value)}
                className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-white"
                placeholder="e.g., TECHVERSE SOLUTIONS (BANGALORE)"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Testimonial Text</label>
              <textarea
                value={testimonialForm.text}
                onChange={(e) => handleTestimonialFormChange("text", e.target.value)}
                className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-white min-h-[100px]"
                placeholder="Enter the testimonial text..."
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Status</label>
                <select
                  value={testimonialForm.status}
                  onChange={(e) => handleTestimonialFormChange("status", e.target.value)}
                  className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-white"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Display Order</label>
                <input
                  type="number"
                  value={testimonialForm.order}
                  onChange={(e) => handleTestimonialFormChange("order", parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-white"
                  placeholder="0"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="bg-white text-black font-bold px-6 py-2 rounded hover:bg-gray-200 transition-colors"
              >
                {editingTestimonial ? "UPDATE" : "CREATE"}
              </button>
              <button
                type="button"
                onClick={() => setShowTestimonialForm(false)}
                className="bg-zinc-700 text-white font-bold px-6 py-2 rounded hover:bg-zinc-600 transition-colors"
              >
                CANCEL
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {testimonials.length === 0 ? (
          <div className="text-gray-500 text-center py-10 bg-zinc-900/50 rounded-xl border border-zinc-800 border-dashed">
            No testimonials found. Add your first one!
          </div>
        ) : (
          testimonials.map((testimonial) => (
            <div key={testimonial._id} className="bg-zinc-900 p-5 rounded-xl border border-zinc-800 hover:border-zinc-600 transition-colors">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-white">{testimonial.name}</h4>
                    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${testimonial.status === "active" ? "bg-green-900 text-green-400" : "bg-gray-900 text-gray-400"}`}>
                      {testimonial.status}
                    </span>
                    <span className="text-xs text-gray-500">Order: {testimonial.order}</span>
                  </div>
                  <p className="text-sm text-[#F5EE30] mb-2">{testimonial.company}</p>
                </div>
              </div>
              <p className="text-sm text-gray-300 mb-4 italic">&quot;{testimonial.text}&quot;</p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleEditTestimonial(testimonial)}
                  className="text-xs font-bold text-white bg-zinc-700 hover:bg-zinc-600 px-3 py-1.5 rounded transition-colors"
                >
                  EDIT
                </button>
                <button
                  onClick={() => openTestimonialDeleteModal(testimonial)}
                  className="text-xs font-bold text-red-400 hover:text-red-300 px-2 py-1.5 rounded transition-colors"
                >
                  DELETE
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
