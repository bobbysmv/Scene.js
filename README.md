Scene.js
========

ツリー構造を持つシーンの概念を導入するためのライブラリ

```
goto "/"
1, /.enter
2,   => /.show

--------------------------------------------------------

goto "/child"
1, /.enter 
2,         => /child.enter
3,               => /child.show

--------------------------------------------------------

goto "/child/a" from "/child"
   /          /child
1,               <= /child.hide 
2,                   => /child/a.enter
3,                         => /child/a.show

--------------------------------------------------------

goto "/child2" from "/child/a"
   /          /child    /child/a
1,                         <= /child/a.hide
2,                   <= /child/a.leave
3, /       <= /child.leave
4, /       => /child2.enter
5,               => /child2.show


```

使い方 TODO
-----

```
Scene.add("/").set({
	/**
	 * 
	 */
	onEnter: function(){},
	/**
	 *
	 */
	onShow: function(){},
	/**
	 *
	 */
	onHide: function(){},
	/**
	 *
	 */
	onLeave: function(){},
	
});

Scene.add( "/child", new Scene() );

Scene.goto("/");


```