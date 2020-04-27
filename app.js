'use strict'

Zepto(function ($) {
	// 渲染模版
	function render(name, data) {
		return _.template($('#' + name).html())(data)
	}

	$.getJSON('data.json', function (data) {
		var list = data.list.reverse()
		// 主页
		router(/^\/$/, function () {
			var page = 0
			$('#container').append('<div class="list"></div>')
			list.slice(page, page + 10).forEach(function (item) {
				$('.list').append(render('item', item))
			})
			$(window).scroll(function () {
				let i = $(document.body).get(0).getBoundingClientRect()
				var offset = ~~(i.top + i.height - document.documentElement.clientHeight)
				if (offset <= 0 && page < list.length) {
					page += 10
					list.slice(page, page + 10).forEach(function (item) {
						$('.list').append(render('item', item))
					})
				}
			})
		})

		// 详情
		router(/^\/\S+$/, function () {
			var info = list.find(function (i) {
				return i.link == location.pathname.slice(1)
			})

			$('#container').append(info ?
				render('detail', info) :
				render('notfound', {}))
			$('#container').append(render('recommends', {
				list: list.filter(function (i) {
					if (!info) return true
					return i.link !== info.link
				}).sort(function () {
					return Math.random() - .5
				}).slice(0, 6)
			}))
		})
	})
})

function router(path, callback) {
	if (path.test(location.pathname)) callback()
}