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
			$('#container').append('<div class="list"></div>')
			list.forEach(function (item) {
				$('.list').append(render('item', item))
			})
		})

		// 详情
		router(/^\/\S+$/, function () {
			var info = list.find(function (i) {
				return i.link == location.pathname.slice(1)
			})

			if (!info) {
				// 404
				return $('#container').append(render('notfound', {}))
			} else {
				$('#container').append(render('detail', info))
				$('#container').append(render('recommends', {
					list: list.filter(function (i) {
						return i.link !== info.link
					}).sort(function () {
						return Math.random() - .5
					}).slice(0, 6)
				}))
			}
		})
	})
})

function router(path, callback) {
	if (path.test(location.pathname)) callback()
}